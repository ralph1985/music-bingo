import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { createAdminGame } from "@/server/games/create-admin-game";

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
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.ADMIN_COMMAND_SECRET;

  if (text === null || text.length > MAX_PLAYLIST_LENGTH) {
    return NextResponse.json({ error: "La lista no es válida o excede el límite." }, { status: 400 });
  }
  if (!cloudUrl || !secret) {
    return NextResponse.json({ error: "La creación de partidas no está configurada." }, { status: 503 });
  }

  try {
    const game = await createAdminGame({ cloudUrl, secret, text });
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la partida.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

async function readPlaylist(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { text?: unknown };
    return typeof body.text === "string" ? body.text : null;
  } catch {
    return null;
  }
}
