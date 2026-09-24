import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { isAuthorizedAdminCommand, parseCallSongRequest, parseCreateGameRequest } from "./admin_command";

const http = httpRouter();

http.route({
  path: "/admin/games",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorizedAdminCommand(request.headers.get("x-admin-command-secret"), env.ADMIN_COMMAND_SECRET)) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    const command = parseCreateGameRequest(body);

    if (!command) {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    const activeGame = await ctx.runQuery(internal.games.getActiveGame, {});

    if (activeGame) {
      return Response.json({ error: `Ya hay una partida activa (${activeGame.joinCode}). Cancélala antes de crear otra.` }, { status: 423 });
    }

    try {
      const gameId = await ctx.runMutation(internal.games.createGame, command);

      if (!gameId) {
        return Response.json({ error: "El código de partida ya existe." }, { status: 409 });
      }
    } catch {
      return Response.json({ error: "No se pudo crear la partida." }, { status: 422 });
    }

    return Response.json({ joinCode: command.joinCode }, { status: 201 });
  }),
});

http.route({
  path: "/admin/games",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorizedAdminCommand(request.headers.get("x-admin-command-secret"), env.ADMIN_COMMAND_SECRET)) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || typeof (body as { joinCode?: unknown }).joinCode !== "string") {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    await ctx.runMutation(internal.games.cancelGame, { joinCode: (body as { joinCode: string }).joinCode });
    return Response.json({ ok: true });
  }),
});

http.route({
  path: "/admin/games",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorizedAdminCommand(request.headers.get("x-admin-command-secret"), env.ADMIN_COMMAND_SECRET)) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const activeGame = await ctx.runQuery(internal.games.getActiveAdminGame, {});
    return Response.json(activeGame ? {
      calledSongIds: activeGame.game.calledSongIds,
      joinCode: activeGame.game.joinCode,
      players: activeGame.players,
      playlist: activeGame.game.playlist,
      status: activeGame.game.status,
    } : {});
  }),
});

http.route({
  path: "/admin/games/start",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorizedAdminCommand(request.headers.get("x-admin-command-secret"), env.ADMIN_COMMAND_SECRET)) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { joinCode?: unknown } | null;
    if (typeof body?.joinCode !== "string") {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    await ctx.runMutation(internal.games.startGame, { joinCode: body.joinCode });
    return Response.json({ ok: true });
  }),
});

http.route({
  path: "/admin/calls",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorizedAdminCommand(request.headers.get("x-admin-command-secret"), env.ADMIN_COMMAND_SECRET)) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    const command = parseCallSongRequest(body);

    if (!command) {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    try {
      await ctx.runMutation(internal.games.callSong, command);
    } catch {
      return Response.json({ error: "No se pudo anunciar la canción." }, { status: 422 });
    }

    return Response.json({ ok: true });
  }),
});

export default http;
