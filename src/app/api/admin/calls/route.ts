import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { callSongCommand } from "@/server/convex/admin-command";

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

  try {
    await callSongCommand({ cloudUrl, secret, ...command });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo anunciar la canción." }, { status: 422 });
  }
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
