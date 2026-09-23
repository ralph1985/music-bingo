import { NextResponse } from "next/server";

import { createAdminSession, verifyAdminPassword } from "@/server/auth/admin-auth";

const SESSION_COOKIE = "music_bingo_admin";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

export async function POST(request: Request) {
  const password = await readPassword(request);
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!password || !sessionSecret || !verifyAdminPassword(password, passwordHash)) {
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createAdminSession(sessionSecret, Date.now(), SESSION_DURATION_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

async function readPassword(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { password?: unknown };
    return typeof body.password === "string" ? body.password : null;
  } catch {
    return null;
  }
}
