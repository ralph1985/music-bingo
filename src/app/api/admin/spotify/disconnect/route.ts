import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { SPOTIFY_REFRESH_COOKIE } from "../callback/route";

export async function POST() {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SPOTIFY_REFRESH_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/api/admin", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
