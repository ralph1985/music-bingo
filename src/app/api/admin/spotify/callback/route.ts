import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { SPOTIFY_RETURN_COOKIE } from "../connect/route";
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
  const returnTo = cookieStore.get(SPOTIFY_RETURN_COOKIE)?.value === "calls" ? "calls" : "setup";

  if (!hasAdminSession(session, sessionSecret)) return NextResponse.redirect(new URL("/admin", request.url));
  if (!session || !sessionSecret || !clientId || !clientSecret || !redirectUri || !encryptionKey || !code || !state || !verifySpotifyState(state, session, sessionSecret)) {
    return adminSpotifyRedirect(request, "error", returnTo);
  }

  try {
    const token = await exchangeSpotifyToken({ clientId, clientSecret, code, redirectUri });
    if (!token.refreshToken) throw new Error("Spotify did not return a refresh token.");
    const response = adminSpotifyRedirect(request, "connected", returnTo);
    response.cookies.set(SPOTIFY_REFRESH_COOKIE, encryptSpotifyRefreshToken(token.refreshToken, encryptionKey), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/api/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return adminSpotifyRedirect(request, "error", returnTo);
  }
}

function adminSpotifyRedirect(request: Request, status: "connected" | "error", returnTo: "calls" | "setup"): NextResponse {
  const destination = new URL("/admin", request.url);
  destination.searchParams.set("spotify", status);
  if (returnTo === "calls") destination.searchParams.set("tab", returnTo);
  const response = NextResponse.redirect(destination);
  response.cookies.set(SPOTIFY_RETURN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/admin/spotify",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export { SPOTIFY_REFRESH_COOKIE };
