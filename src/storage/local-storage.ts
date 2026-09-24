import type { LocalGame } from "../domain/types";

export type LocalStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const LOCAL_GAME_STORAGE_KEY = "music-bingo.local-game";
const LOCAL_GAME_STORAGE_VERSION = 1;

export function loadLocalGame(storage: LocalStorage): LocalGame | null {
  const storedValue = storage.getItem(LOCAL_GAME_STORAGE_KEY);

  if (storedValue === null) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(storedValue);

    if (!isVersionOnePayload(payload)) {
      return null;
    }

    return payload.game;
  } catch {
    return null;
  }
}

export function saveLocalGame(storage: LocalStorage, game: LocalGame): void {
  if (!isLocalGame(game)) {
    return;
  }

  storage.setItem(
    LOCAL_GAME_STORAGE_KEY,
    JSON.stringify({ version: LOCAL_GAME_STORAGE_VERSION, game }),
  );
}

export function clearLocalGame(storage: LocalStorage): void {
  storage.removeItem(LOCAL_GAME_STORAGE_KEY);
}

function isVersionOnePayload(value: unknown): value is { version: 1; game: LocalGame } {
  return (
    isRecord(value) &&
    value.version === LOCAL_GAME_STORAGE_VERSION &&
    isLocalGame(value.game)
  );
}

function isLocalGame(value: unknown): value is LocalGame {
  return (
    isRecord(value) &&
    typeof value.gameId === "string" &&
    isPlayer(value.player) &&
    isCard(value.card) &&
    Array.isArray(value.markedSongIds) &&
    value.markedSongIds.every((songId) => typeof songId === "string")
  );
}

function isPlayer(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isCard(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.rows === "number" &&
    Number.isInteger(value.rows) &&
    value.rows > 0 &&
    typeof value.cols === "number" &&
    Number.isInteger(value.cols) &&
    value.cols > 0 &&
    Array.isArray(value.songs) &&
    value.songs.length === value.rows * value.cols &&
    value.songs.every(isSong)
  );
}

function isSong(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.artist === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
