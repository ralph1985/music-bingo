import type { Card, LocalGame, PlayerCard, Song } from "../domain/types";

export type LocalStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type LegacyLocalGame = {
  card: Card;
  gameId: string;
  markedSongIds: string[];
  player: { id: string; name: string };
};

const LOCAL_GAME_STORAGE_KEY = "music-bingo.local-game";
const LOCAL_GAME_STORAGE_VERSION = 2;

export function loadLocalGame(storage: LocalStorage): LocalGame | null {
  const storedValue = storage.getItem(LOCAL_GAME_STORAGE_KEY);
  if (storedValue === null) return null;

  try {
    const payload: unknown = JSON.parse(storedValue);
    if (isVersionTwoPayload(payload)) return payload.game;
    if (isVersionOnePayload(payload)) {
      return {
        cards: [{ id: `card-legacy-${payload.game.player.id}`, markedSongIds: payload.game.markedSongIds, songs: payload.game.card.songs }],
        gameId: payload.game.gameId,
        player: payload.game.player,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalGame(storage: LocalStorage, game: LocalGame): void {
  if (!isLocalGame(game)) return;
  storage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: LOCAL_GAME_STORAGE_VERSION, game }));
}

export function clearLocalGame(storage: LocalStorage): void {
  storage.removeItem(LOCAL_GAME_STORAGE_KEY);
}

function isVersionTwoPayload(value: unknown): value is { version: 2; game: LocalGame } {
  return isRecord(value) && value.version === 2 && isLocalGame(value.game);
}

function isVersionOnePayload(value: unknown): value is { version: 1; game: LegacyLocalGame } {
  return isRecord(value) && value.version === 1 && isLegacyLocalGame(value.game);
}

function isLegacyLocalGame(value: unknown): value is LegacyLocalGame {
  return isRecord(value) && typeof value.gameId === "string" && isPlayer(value.player) && isCard(value.card)
    && Array.isArray(value.markedSongIds) && value.markedSongIds.every((songId) => typeof songId === "string");
}

function isLocalGame(value: unknown): value is LocalGame {
  return isRecord(value) && typeof value.gameId === "string" && isPlayer(value.player)
    && Array.isArray(value.cards) && value.cards.length > 0 && value.cards.every(isPlayerCard)
    && new Set(value.cards.map((card) => card.id)).size === value.cards.length;
}

function isPlayer(value: unknown): value is { id: string; name: string } {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isPlayerCard(value: unknown): value is PlayerCard {
  return isRecord(value) && typeof value.id === "string" && Array.isArray(value.markedSongIds)
    && value.markedSongIds.every((songId) => typeof songId === "string")
    && Array.isArray(value.songs) && value.songs.length > 0 && value.songs.every(isSong)
    && new Set(value.songs.map((song) => song.id)).size === value.songs.length;
}

function isCard(value: unknown): value is Card {
  return isRecord(value) && typeof value.rows === "number" && Number.isInteger(value.rows) && value.rows > 0
    && typeof value.cols === "number" && Number.isInteger(value.cols) && value.cols > 0
    && Array.isArray(value.songs) && value.songs.length === value.rows * value.cols && value.songs.every(isSong);
}

function isSong(value: unknown): value is Song {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.artist === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
