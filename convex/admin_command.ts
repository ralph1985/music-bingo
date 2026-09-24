type Song = { artist: string; id: string; title: string };

type CreateGameRequest = { joinCode: string; playlist: Song[] };
type CallSongRequest = { joinCode: string; songId: string };

export function isAuthorizedAdminCommand(providedSecret: string | null, expectedSecret: string): boolean {
  return Boolean(providedSecret && expectedSecret && providedSecret === expectedSecret);
}

export function parseCreateGameRequest(value: unknown): CreateGameRequest | null {
  if (!isRecord(value) || typeof value.joinCode !== "string" || !Array.isArray(value.playlist)) {
    return null;
  }

  const playlist: Song[] = [];

  for (const song of value.playlist) {
    if (!isRecord(song) || typeof song.id !== "string" || typeof song.title !== "string" || typeof song.artist !== "string") {
      return null;
    }
    playlist.push({ id: song.id, title: song.title, artist: song.artist });
  }

  return { joinCode: value.joinCode, playlist };
}

export function parseCallSongRequest(value: unknown): CallSongRequest | null {
  if (!isRecord(value) || typeof value.joinCode !== "string" || typeof value.songId !== "string") {
    return null;
  }

  return { joinCode: value.joinCode, songId: value.songId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
