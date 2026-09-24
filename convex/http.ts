import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { isAuthorizedAdminCommand, parseCreateGameRequest } from "./admin_command";

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

export default http;
