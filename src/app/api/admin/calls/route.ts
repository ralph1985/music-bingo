import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { callSongCommand, getActiveGameCommand } from "@/server/convex/admin-command";
import { decryptSpotifyRefreshToken, encryptSpotifyRefreshToken } from "@/server/spotify/oauth";
import { SpotifyPlaybackError, startSpotifyTrack } from "@/server/spotify/spotify-playback";
import { exchangeSpotifyToken } from "@/server/spotify/tokens";
import { SPOTIFY_REFRESH_COOKIE } from "../spotify/callback/route";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.ADMIN_COMMAND_SECRET;

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!cloudUrl || !secret) {
    return NextResponse.json({ error: "El control de canciones no está configurado." }, { status: 503 });
  }

  const command = await readCommand(request);

  if (!command) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  let spotifyUri: string | undefined;
  try {
    const game = await getActiveGameCommand({ cloudUrl: cloudUrl!, joinCode: command.joinCode, secret: secret! });
    spotifyUri = game?.playlist.find((song) => song.id === command.songId)?.spotifyUri;
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la canción seleccionada." }, { status: 422 });
  }

  let refreshedSpotifyToken: string | null = null;
  if (spotifyUri) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
    const encryptedRefreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;

    if (!clientId || !clientSecret || !encryptionKey || !encryptedRefreshToken) {
      return NextResponse.json({ error: "Conecta Spotify con permisos de reproducción antes de anunciar esta canción." }, { status: 503 });
    }

    try {
      const refreshToken = decryptSpotifyRefreshToken(encryptedRefreshToken, encryptionKey);
      const token = await exchangeSpotifyToken({ clientId, clientSecret, refreshToken });
      await startSpotifyTrack({ accessToken: token.accessToken, trackUri: spotifyUri });
      refreshedSpotifyToken = token.refreshToken ? encryptSpotifyRefreshToken(token.refreshToken, encryptionKey) : null;
    } catch (error) {
      if (error instanceof SpotifyPlaybackError) return spotifyPlaybackResponse(error);
      return NextResponse.json({ error: "No se pudo iniciar la reproducción en Spotify. Vuelve a conectar la cuenta e inténtalo de nuevo." }, { status: 422 });
    }
  }

  try {
    await callSongCommand({ cloudUrl, secret, ...command });
  } catch {
    return NextResponse.json({ error: "No se pudo anunciar la canción." }, { status: 422 });
  }

  const response = NextResponse.json({ ok: true });
  if (refreshedSpotifyToken) {
    response.cookies.set(SPOTIFY_REFRESH_COOKIE, refreshedSpotifyToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/api/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

function spotifyPlaybackResponse(error: SpotifyPlaybackError): NextResponse {
  if (error.code === "forbidden") {
    return NextResponse.json({ error: "Spotify no permite controlar la reproducción. Desconecta y vuelve a conectar la cuenta para conceder el permiso nuevo." }, { status: 403 });
  }
  if (error.code === "no-device") {
    return NextResponse.json({ error: "No hay ningún dispositivo Spotify activo. Abre Spotify en el dispositivo donde quieres reproducir la partida." }, { status: 404 });
  }
  if (error.code === "unauthorized") {
    return NextResponse.json({ error: "La conexión con Spotify ha caducado. Desconecta y vuelve a conectar la cuenta." }, { status: 401 });
  }
  if (error.code === "rate-limited") {
    return NextResponse.json({ error: "Spotify está limitando las solicitudes. Inténtalo de nuevo en un momento." }, { status: 429 });
  }
  return NextResponse.json({ error: "Spotify no pudo iniciar esta canción." }, { status: 422 });
}

async function readCommand(request: Request): Promise<{ joinCode: string; songId: string } | null> {
  try {
    const body = (await request.json()) as { joinCode?: unknown; songId?: unknown };

    if (typeof body.joinCode !== "string" || typeof body.songId !== "string") {
      return null;
    }

    return { joinCode: body.joinCode, songId: body.songId };
  } catch {
    return null;
  }
}
