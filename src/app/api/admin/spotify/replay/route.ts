import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { getActiveGameCommand } from "@/server/convex/admin-command";
import { decryptSpotifyRefreshToken, encryptSpotifyRefreshToken } from "@/server/spotify/oauth";
import { SpotifyPlaybackError, startSpotifyTrack } from "@/server/spotify/spotify-playback";
import { exchangeSpotifyToken } from "@/server/spotify/tokens";
import { SPOTIFY_REFRESH_COOKIE } from "../callback/route";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.ADMIN_COMMAND_SECRET;

  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!cloudUrl || !secret) return NextResponse.json({ error: "El control de canciones no está configurado." }, { status: 503 });

  const command = await readCommand(request);
  if (!command) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  let game;
  try {
    game = await getActiveGameCommand({ cloudUrl, joinCode: command.joinCode, secret });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la partida." }, { status: 422 });
  }

  const song = game?.playlist.find((candidate) => candidate.id === command.songId);
  if (!game || (game.status !== "playing" && game.status !== "completed") || !game.calledSongIds.includes(command.songId)) {
    return NextResponse.json({ error: "Solo puedes reproducir de nuevo canciones ya anunciadas." }, { status: 409 });
  }
  if (!song?.spotifyUri) {
    return NextResponse.json({ error: "Esta canción no tiene una reproducción disponible en Spotify." }, { status: 422 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
  const encryptedRefreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  if (!clientId || !clientSecret || !encryptionKey || !encryptedRefreshToken) {
    return NextResponse.json({ error: "Conecta Spotify con permisos de reproducción antes de repetir esta canción." }, { status: 503 });
  }

  try {
    const refreshToken = decryptSpotifyRefreshToken(encryptedRefreshToken, encryptionKey);
    const token = await exchangeSpotifyToken({ clientId, clientSecret, refreshToken });
    await startSpotifyTrack({ accessToken: token.accessToken, trackUri: song.spotifyUri });
    const response = NextResponse.json({ ok: true });
    if (token.refreshToken) {
      response.cookies.set(SPOTIFY_REFRESH_COOKIE, encryptSpotifyRefreshToken(token.refreshToken, encryptionKey), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/api/admin",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch (error) {
    if (error instanceof SpotifyPlaybackError) return spotifyPlaybackResponse(error);
    return NextResponse.json({ error: "No se pudo repetir la reproducción en Spotify. Vuelve a conectar la cuenta e inténtalo de nuevo." }, { status: 422 });
  }
}

function spotifyPlaybackResponse(error: SpotifyPlaybackError): NextResponse {
  if (error.code === "forbidden") return NextResponse.json({ error: "Spotify no permite controlar la reproducción. Desconecta y vuelve a conectar la cuenta para conceder el permiso nuevo." }, { status: 403 });
  if (error.code === "no-device") return NextResponse.json({ error: "No hay ningún dispositivo Spotify activo. Abre Spotify en el dispositivo donde quieres reproducir la partida." }, { status: 404 });
  if (error.code === "unauthorized") return NextResponse.json({ error: "La conexión con Spotify ha caducado. Desconecta y vuelve a conectar la cuenta." }, { status: 401 });
  if (error.code === "rate-limited") return NextResponse.json({ error: "Spotify está limitando las solicitudes. Inténtalo de nuevo en un momento." }, { status: 429 });
  return NextResponse.json({ error: "Spotify no pudo iniciar esta canción." }, { status: 422 });
}

async function readCommand(request: Request): Promise<{ joinCode: string; songId: string } | null> {
  try {
    const body = await request.json() as { joinCode?: unknown; songId?: unknown };
    return typeof body.joinCode === "string" && typeof body.songId === "string"
      ? { joinCode: body.joinCode, songId: body.songId }
      : null;
  } catch {
    return null;
  }
}
