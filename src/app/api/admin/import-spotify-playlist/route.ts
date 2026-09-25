import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { parseSpotifyPlaylistReference } from "@/server/music/spotify-playlist";
import { decryptSpotifyRefreshToken } from "@/server/spotify/oauth";
import { SpotifyApiError, importSpotifyPlaylist } from "@/server/spotify/spotify-client";
import { exchangeSpotifyToken } from "@/server/spotify/tokens";
import { SPOTIFY_REFRESH_COOKIE } from "../spotify/callback/route";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
  const reference = await readPlaylistReference(request);

  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!clientId || !clientSecret || !encryptionKey) return NextResponse.json({ error: "Spotify no está configurado." }, { status: 503 });
  if (!reference) return NextResponse.json({ error: "El enlace de Spotify no es una playlist válida." }, { status: 400 });

  const encryptedRefreshToken = cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value;
  if (!encryptedRefreshToken) return NextResponse.json({ error: "Conecta Spotify antes de importar una lista." }, { status: 401 });

  try {
    const refreshToken = decryptSpotifyRefreshToken(encryptedRefreshToken, encryptionKey);
    const token = await exchangeSpotifyToken({ clientId, clientSecret, refreshToken });
    const imported = await importSpotifyPlaylist({ accessToken: token.accessToken, playlistId: reference.id });
    return NextResponse.json({ source: "spotify", ...imported });
  } catch (error) {
    return NextResponse.json({ error: spotifyErrorMessage(error) }, { status: error instanceof SpotifyApiError && error.code === "access-denied" ? 403 : 422 });
  }
}

async function readPlaylistReference(request: Request): Promise<{ id: string } | null> {
  try {
    const body = await request.json() as { playlist?: unknown };
    return typeof body.playlist === "string" ? parseSpotifyPlaylistReference(body.playlist) : null;
  } catch {
    return null;
  }
}

function spotifyErrorMessage(error: unknown): string {
  if (error instanceof SpotifyApiError) {
    if (error.code === "access-denied") return "Conecta la cuenta propietaria o colaboradora de esta playlist.";
    if (error.code === "not-found") return "No se encontró esa playlist de Spotify.";
    if (error.code === "rate-limited") return "Spotify está limitando las solicitudes. Inténtalo de nuevo en un momento.";
    if (error.code === "unauthorized") return "La conexión con Spotify ha caducado. Vuelve a conectarla.";
  }
  return "No se pudo importar la playlist de Spotify.";
}
