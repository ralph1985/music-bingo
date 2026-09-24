import { ConvexCommandError, createGameCommand } from "../convex/admin-command";
import { importPlaylist } from "../music/playlist-import";
import { prepareGamePlaylist } from "./game-playlist";
import { generateJoinCode } from "./join-code";

const MAX_CREATE_ATTEMPTS = 8;
const MIN_PLAYLIST_SONGS = 24;

type CreateAdminGameInput = {
  cloudUrl: string;
  fetcher?: typeof fetch;
  randomBytes?: (size: number) => Uint8Array;
  secret: string;
  text: string;
};

export async function createAdminGame({
  cloudUrl,
  fetcher,
  randomBytes,
  secret,
  text,
}: CreateAdminGameInput): Promise<{ joinCode: string }> {
  const imported = importPlaylist(text);

  if (imported.errors.length > 0) {
    throw new Error("Primero corrige las filas inválidas de la playlist.");
  }

  const playlist = prepareGamePlaylist(imported.songs, MIN_PLAYLIST_SONGS);

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const joinCode = await generateJoinCode({
      exists: async () => false,
      randomBytes,
    });

    try {
      return await createGameCommand({ cloudUrl, fetcher, joinCode, playlist, secret });
    } catch (error) {
      if (error instanceof ConvexCommandError && error.status === 409) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("No se pudo generar un código de partida único.");
}
