import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { finishGameCommand } from "@/server/convex/admin-command";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.ADMIN_COMMAND_SECRET;
  const joinCode = await readJoinCode(request);

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!cloudUrl || !secret) {
    return NextResponse.json({ error: "El cierre de partida no está configurado." }, { status: 503 });
  }
  if (!joinCode) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    await finishGameCommand({ cloudUrl, joinCode, secret });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo finalizar la partida." }, { status: 422 });
  }
}

async function readJoinCode(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { joinCode?: unknown };
    return typeof body.joinCode === "string" ? body.joinCode : null;
  } catch {
    return null;
  }
}
