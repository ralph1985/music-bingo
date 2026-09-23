import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { importPlaylist } from "@/server/music/playlist-import";

const MAX_PLAYLIST_LENGTH = 150_000;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const text = await readPlaylist(request);

  if (text === null || text.length > MAX_PLAYLIST_LENGTH) {
    return NextResponse.json({ error: "La lista no es válida o excede el límite." }, { status: 400 });
  }

  return NextResponse.json(importPlaylist(text));
}

async function readPlaylist(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { text?: unknown };
    return typeof body.text === "string" ? body.text : null;
  } catch {
    return null;
  }
}
