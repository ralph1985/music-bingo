import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";
import { cancelGameCommand, getActiveGameCommand, getGameHistoryCommand } from "@/server/convex/admin-command";
import { createAdminGame } from "@/server/games/create-admin-game";
import { ImportedSong } from "@/server/music/playlist-import";

const MAX_PLAYLIST_LENGTH = 150_000;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authorized = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const playlistInput = await readPlaylist(request);
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.ADMIN_COMMAND_SECRET;

  if (!playlistInput || playlistInput.text.length > MAX_PLAYLIST_LENGTH) {
    return NextResponse.json({ error: "La lista no es válida o excede el límite." }, { status: 400 });
  }
  if (!cloudUrl || !secret) {
    return NextResponse.json({ error: "La creación de partidas no está configurada." }, { status: 503 });
  }

  try {
    const game = await createAdminGame({ cloudUrl, secret, songs: playlistInput.songs, text: playlistInput.text });
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la partida.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(request: Request) {
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
    return NextResponse.json({ error: "La cancelación no está configurada." }, { status: 503 });
  }
  if (!joinCode) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    await cancelGameCommand({ cloudUrl, joinCode, secret });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo cancelar la partida." }, { status: 422 });
  }
}

export async function GET(request: Request) {
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
    return NextResponse.json({ error: "La consulta de partidas no está configurada." }, { status: 503 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const historyRequested = searchParams.get("history") === "true";
    if (historyRequested) {
      return NextResponse.json({ games: await getGameHistoryCommand({ cloudUrl, secret }) }, {
        headers: { "cache-control": "no-store" },
      });
    }
    const joinCode = searchParams.get("joinCode") ?? undefined;
    return NextResponse.json(await getActiveGameCommand({ cloudUrl, joinCode, secret }), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    const historyRequested = new URL(request.url).searchParams.get("history") === "true";
    return NextResponse.json({ error: historyRequested ? "No se pudo consultar el historial de partidas." : "No se pudo consultar la partida activa." }, { status: 422 });
  }
}

async function readPlaylist(request: Request): Promise<{ songs?: ImportedSong[]; text: string } | null> {
  try {
    const body = (await request.json()) as { songs?: unknown; text?: unknown };
    if (typeof body.text !== "string") return null;
    if (body.songs === undefined) return { text: body.text };
    if (!Array.isArray(body.songs) || !body.songs.every(isImportedSong)) return null;
    return { songs: body.songs, text: body.text };
  } catch {
    return null;
  }
}

function isImportedSong(value: unknown): value is ImportedSong {
  if (typeof value !== "object" || value === null) return false;
  const song = value as ImportedSong;
  return typeof song.title === "string"
    && typeof song.artist === "string"
    && (song.spotifyUri === undefined || (typeof song.spotifyUri === "string" && /^spotify:track:[A-Za-z0-9_-]+$/.test(song.spotifyUri)));
}

async function readJoinCode(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { joinCode?: unknown };
    return typeof body.joinCode === "string" ? body.joinCode : null;
  } catch {
    return null;
  }
}
