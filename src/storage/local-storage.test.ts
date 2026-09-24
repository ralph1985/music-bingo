import { describe, expect, it } from "vitest";

import type { LocalGame } from "../domain/types";
import { clearLocalGame, loadLocalGame, saveLocalGame } from "./local-storage";

const LOCAL_GAME_STORAGE_KEY = "music-bingo.local-game";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const localGame: LocalGame = {
  gameId: "game-1",
  player: { id: "player-1", name: "Rafa" },
  card: {
    rows: 1,
    cols: 2,
    songs: [
      { id: "song-1", title: "Canción 1", artist: "Artista 1" },
      { id: "song-2", title: "Canción 2", artist: "Artista 2" },
    ],
  },
  markedSongIds: ["song-1"],
};

describe("local game storage", () => {
  it("round trips a version one local game", () => {
    const storage = new MemoryStorage();

    saveLocalGame(storage, localGame);

    expect(storage.getItem(LOCAL_GAME_STORAGE_KEY)).toBe(
      JSON.stringify({ version: 1, game: localGame }),
    );
    expect(loadLocalGame(storage)).toEqual(localGame);
  });

  it("returns null when no local game is stored", () => {
    expect(loadLocalGame(new MemoryStorage())).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_GAME_STORAGE_KEY, "{");

    expect(loadLocalGame(storage)).toBeNull();
  });

  it("returns null for an unknown payload version", () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 2, game: localGame }));

    expect(loadLocalGame(storage)).toBeNull();
  });

  it("returns null for a game whose card geometry does not match its songs", () => {
    const storage = new MemoryStorage();
    const invalidGame = {
      ...localGame,
      card: { ...localGame.card, rows: 3, cols: 4 },
    };
    storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 1, game: invalidGame }));

    expect(loadLocalGame(storage)).toBeNull();
  });

  it("does not store an invalid local game", () => {
    const storage = new MemoryStorage();
    const invalidGame = { ...localGame, markedSongIds: [42] } as unknown as LocalGame;

    saveLocalGame(storage, invalidGame);

    expect(storage.getItem(LOCAL_GAME_STORAGE_KEY)).toBeNull();
  });

  it("clears the stored local game", () => {
    const storage = new MemoryStorage();
    saveLocalGame(storage, localGame);

    clearLocalGame(storage);

    expect(loadLocalGame(storage)).toBeNull();
  });
});
