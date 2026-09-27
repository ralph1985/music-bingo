type Song = { artist: string; id: string; spotifyUri?: string; title: string };

type CreateGameCommandInput = {
  cloudUrl: string;
  fetcher?: typeof fetch;
  joinCode: string;
  playlist: Song[];
  secret: string;
};

type CallSongCommandInput = Omit<CreateGameCommandInput, "playlist"> & {
  songId: string;
};

export type AdminGameHistoryItem = {
  calledSongCount: number;
  completedAt: number | null;
  endedAt: number | null;
  fullCardWinnerName: string | null;
  joinCode: string;
  lineWinnerName: string | null;
  playerCount: number;
  startedAt: number | null;
  status: "cancelled" | "completed";
};

export class ConvexCommandError extends Error {
  constructor(readonly status: number, message = "No se pudo crear la partida.") {
    super(message);
  }
}

export async function createGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  playlist,
  secret,
}: CreateGameCommandInput): Promise<{ joinCode: string }> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode, playlist }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new ConvexCommandError(
      response.status,
      typeof errorBody?.error === "string" ? errorBody.error : undefined,
    );
  }

  const body = (await response.json()) as { joinCode?: unknown };

  if (typeof body.joinCode !== "string") {
    throw new Error("La creación de la partida devolvió una respuesta inválida.");
  }

  return { joinCode: body.joinCode };
}

export async function callSongCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
  songId,
}: CallSongCommandInput): Promise<void> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/calls`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode, songId }),
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }
}

export async function cancelGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
}: Omit<CreateGameCommandInput, "playlist">): Promise<void> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode }),
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }
}

export async function deleteGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
}: Omit<CreateGameCommandInput, "playlist">): Promise<boolean> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games/history`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new ConvexCommandError(
      response.status,
      typeof errorBody?.error === "string" ? errorBody.error : "No se pudo borrar la partida.",
    );
  }

  const body = await response.json() as { deleted?: unknown };
  return body.deleted === true;
}

export async function startGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
}: Omit<CreateGameCommandInput, "playlist">): Promise<void> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode }),
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }
}

export async function finishGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
}: Omit<CreateGameCommandInput, "playlist">): Promise<void> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games/finish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-command-secret": secret,
    },
    body: JSON.stringify({ joinCode }),
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }
}

export async function getActiveGameCommand({
  cloudUrl,
  fetcher = fetch,
  joinCode,
  secret,
}: Pick<CreateGameCommandInput, "cloudUrl" | "fetcher" | "secret"> & { joinCode?: string }): Promise<{ calledSongIds: string[]; completedAt: number | null; endedAt: number | null; fullCardWinnerPlayerId: string | null; joinCode: string; lineWinnerPlayerId: string | null; players: { id: string; name: string }[]; playlist: Song[]; startedAt: number | null; status: string } | null> {
  const url = new URL(`${deriveConvexSiteUrl(cloudUrl)}/admin/games`);
  if (joinCode) url.searchParams.set("joinCode", joinCode);
  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: { "x-admin-command-secret": secret },
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }

  const body = await response.json() as { calledSongIds?: unknown; completedAt?: unknown; endedAt?: unknown; fullCardWinnerPlayerId?: unknown; joinCode?: unknown; lineWinnerPlayerId?: unknown; players?: unknown; playlist?: unknown; startedAt?: unknown; status?: unknown };
  if (typeof body.joinCode !== "string" || !Array.isArray(body.playlist) || !Array.isArray(body.calledSongIds) || !Array.isArray(body.players)) {
    return null;
  }
  const playlist = body.playlist.filter(isSong);
  const calledSongIds = body.calledSongIds.filter((songId): songId is string => typeof songId === "string");
  const players = body.players.flatMap((player) => typeof player === "object" && player !== null && typeof (player as { id?: unknown }).id === "string" && typeof (player as { name?: unknown }).name === "string" ? [{ id: (player as { id: string }).id, name: (player as { name: string }).name }] : []);
  return playlist.length === body.playlist.length && players.length === body.players.length
    ? { calledSongIds, completedAt: typeof body.completedAt === "number" ? body.completedAt : null, endedAt: typeof body.endedAt === "number" ? body.endedAt : null, fullCardWinnerPlayerId: typeof body.fullCardWinnerPlayerId === "string" ? body.fullCardWinnerPlayerId : null, joinCode: body.joinCode, lineWinnerPlayerId: typeof body.lineWinnerPlayerId === "string" ? body.lineWinnerPlayerId : null, players, playlist, startedAt: typeof body.startedAt === "number" ? body.startedAt : null, status: typeof body.status === "string" ? body.status : "waiting" }
    : null;
}

export async function getGameHistoryCommand({
  cloudUrl,
  fetcher = fetch,
  secret,
}: Pick<CreateGameCommandInput, "cloudUrl" | "fetcher" | "secret">): Promise<AdminGameHistoryItem[]> {
  const url = new URL(`${deriveConvexSiteUrl(cloudUrl)}/admin/games`);
  url.searchParams.set("history", "true");
  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: { "x-admin-command-secret": secret },
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status, "No se pudo consultar el historial de partidas.");
  }

  const body = await response.json() as { games?: unknown };
  if (!Array.isArray(body.games)) {
    throw new Error("El historial de partidas devolvió una respuesta inválida.");
  }

  return body.games.flatMap((game) => isGameHistoryItem(game) ? [game] : []);
}

function isSong(value: unknown): value is Song {
  const spotifyUri = typeof value === "object" && value !== null ? (value as Song).spotifyUri : undefined;
  return typeof value === "object" && value !== null
    && typeof (value as Song).id === "string"
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string"
    && (spotifyUri === undefined || (typeof spotifyUri === "string" && /^spotify:track:[A-Za-z0-9_-]+$/.test(spotifyUri)));
}

function isGameHistoryItem(value: unknown): value is AdminGameHistoryItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<AdminGameHistoryItem>;
  return (item.status === "cancelled" || item.status === "completed")
    && typeof item.calledSongCount === "number"
    && (item.completedAt === null || typeof item.completedAt === "number")
    && (item.endedAt === null || typeof item.endedAt === "number")
    && (item.fullCardWinnerName === null || typeof item.fullCardWinnerName === "string")
    && typeof item.joinCode === "string"
    && (item.lineWinnerName === null || typeof item.lineWinnerName === "string")
    && typeof item.playerCount === "number"
    && (item.startedAt === null || typeof item.startedAt === "number");
}

export function deriveConvexSiteUrl(cloudUrl: string): string {
  const url = new URL(cloudUrl);

  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL no es una URL de Convex válida.");
  }

  url.hostname = `${url.hostname.slice(0, -".cloud".length)}.site`;
  return url.toString().replace(/\/$/, "");
}
