import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { SPOTIFY_REFRESH_COOKIE } from "../callback/route";

export async function GET() {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  return NextResponse.json({ connected: Boolean(cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value) });
}
