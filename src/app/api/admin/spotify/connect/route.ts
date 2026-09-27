import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { buildSpotifyAuthorizeUrl } from "@/server/spotify/oauth";

export const SPOTIFY_RETURN_COOKIE = "music_bingo_spotify_return";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const sessionSecret = process.env.SESSION_SECRET;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!hasAdminSession(session, sessionSecret)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!session || !sessionSecret || !clientId || !redirectUri) return NextResponse.json({ error: "Spotify no está configurado." }, { status: 503 });

  const returnTo = new URL(request.url).searchParams.get("returnTo") === "calls" ? "calls" : "setup";
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl({ clientId, redirectUri, session, sessionSecret }));
  response.cookies.set(SPOTIFY_RETURN_COOKIE, returnTo, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/admin/spotify",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
