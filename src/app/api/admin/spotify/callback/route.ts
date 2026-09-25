import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { encryptSpotifyRefreshToken, verifySpotifyState } from "@/server/spotify/oauth";
import { exchangeSpotifyToken } from "@/server/spotify/tokens";

const SPOTIFY_REFRESH_COOKIE = "music_bingo_spotify_refresh";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const sessionSecret = process.env.SESSION_SECRET;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!hasAdminSession(session, sessionSecret)) return NextResponse.redirect(new URL("/admin", request.url));
  if (!session || !sessionSecret || !clientId || !clientSecret || !redirectUri || !encryptionKey || !code || !state || !verifySpotifyState(state, session, sessionSecret)) {
    return NextResponse.redirect(new URL("/admin?spotify=error", request.url));
  }

  try {
    const token = await exchangeSpotifyToken({ clientId, clientSecret, code, redirectUri });
    if (!token.refreshToken) throw new Error("Spotify did not return a refresh token.");
    const response = NextResponse.redirect(new URL("/admin?spotify=connected", request.url));
    response.cookies.set(SPOTIFY_REFRESH_COOKIE, encryptSpotifyRefreshToken(token.refreshToken, encryptionKey), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/api/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin?spotify=error", request.url));
  }
}

export { SPOTIFY_REFRESH_COOKIE };
