type Song = { artist: string; id: string; title: string };

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
  secret,
}: Pick<CreateGameCommandInput, "cloudUrl" | "fetcher" | "secret">): Promise<{ calledSongIds: string[]; joinCode: string; playlist: Song[]; status: string } | null> {
  const response = await fetcher(`${deriveConvexSiteUrl(cloudUrl)}/admin/games`, {
    method: "GET",
    headers: { "x-admin-command-secret": secret },
  });

  if (!response.ok) {
    throw new ConvexCommandError(response.status);
  }

  const body = await response.json() as { calledSongIds?: unknown; joinCode?: unknown; playlist?: unknown; status?: unknown };
  if (typeof body.joinCode !== "string" || !Array.isArray(body.playlist) || !Array.isArray(body.calledSongIds)) {
    return null;
  }
  const playlist = body.playlist.filter(isSong);
  const calledSongIds = body.calledSongIds.filter((songId): songId is string => typeof songId === "string");
  return playlist.length === body.playlist.length
    ? { calledSongIds, joinCode: body.joinCode, playlist, status: typeof body.status === "string" ? body.status : "waiting" }
    : null;
}

function isSong(value: unknown): value is Song {
  return typeof value === "object" && value !== null
    && typeof (value as Song).id === "string"
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string";
}

export function deriveConvexSiteUrl(cloudUrl: string): string {
  const url = new URL(cloudUrl);

  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL no es una URL de Convex válida.");
  }

  url.hostname = `${url.hostname.slice(0, -".cloud".length)}.site`;
  return url.toString().replace(/\/$/, "");
}
