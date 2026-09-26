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
  cards: [{
    id: "card-1",
    markedSongIds: ["song-1"],
    songs: [
      { id: "song-1", title: "Canción 1", artist: "Artista 1" },
      { id: "song-2", title: "Canción 2", artist: "Artista 2" },
    ],
  }],
  gameId: "game-1",
  player: { id: "player-1", name: "Rafa" },
};

describe("local game storage", () => {
  it("round trips a version two local game", () => {
    const storage = new MemoryStorage();

    saveLocalGame(storage, localGame);

    expect(storage.getItem(LOCAL_GAME_STORAGE_KEY)).toBe(
      JSON.stringify({ version: 2, game: localGame }),
    );
    expect(loadLocalGame(storage)).toEqual(localGame);
  });

  it("migrates a version one payload to one identified card", () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 1, game: {
      card: { cols: 2, rows: 1, songs: localGame.cards[0].songs },
      gameId: localGame.gameId,
      markedSongIds: ["song-1"],
      player: localGame.player,
    } }));

    expect(loadLocalGame(storage)).toMatchObject({
      cards: [{ id: "card-legacy-player-1", markedSongIds: ["song-1"], songs: localGame.cards[0].songs }],
      gameId: "game-1",
    });
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
    storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 3, game: localGame }));

    expect(loadLocalGame(storage)).toBeNull();
  });

  it("returns null for a game whose card repeats a song", () => {
    const storage = new MemoryStorage();
    const invalidGame = {
      ...localGame,
      cards: [{ ...localGame.cards[0], songs: [localGame.cards[0].songs[0], localGame.cards[0].songs[0]] }],
    };
    storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 2, game: invalidGame }));

    expect(loadLocalGame(storage)).toBeNull();
  });

  it("does not store an invalid local game", () => {
    const storage = new MemoryStorage();
    const invalidGame = { ...localGame, cards: [{ ...localGame.cards[0], markedSongIds: [42] }] } as unknown as LocalGame;

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
