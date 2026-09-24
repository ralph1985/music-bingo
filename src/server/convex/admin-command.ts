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
  constructor(readonly status: number) {
    super("No se pudo crear la partida.");
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
    throw new ConvexCommandError(response.status);
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

export function deriveConvexSiteUrl(cloudUrl: string): string {
  const url = new URL(cloudUrl);

  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL no es una URL de Convex válida.");
  }

  url.hostname = `${url.hostname.slice(0, -".cloud".length)}.site`;
  return url.toString().replace(/\/$/, "");
}
