import { describe, expect, it } from "vitest";

import { generateCards, MAX_CARDS_PER_PLAYER } from "./card-generation";

const playlist = Array.from({ length: 24 }, (_, index) => ({
  artist: `Artista ${index + 1}`,
  id: `song-${index + 1}`,
  title: `Canción ${index + 1}`,
}));

describe("generateCards", () => {
  it("genera cartones reproducibles con IDs y secuencias distintos", () => {
    const first = generateCards({ cardCount: MAX_CARDS_PER_PLAYER, playerIdentity: "player-1", playlist });
    const replayed = generateCards({ cardCount: MAX_CARDS_PER_PLAYER, playerIdentity: "player-1", playlist });

    expect(replayed).toEqual(first);
    expect(first).toHaveLength(MAX_CARDS_PER_PLAYER);
    expect(new Set(first.map((card) => card.id)).size).toBe(MAX_CARDS_PER_PLAYER);
    expect(new Set(first.map((card) => card.songs.map((song) => song.id).join(","))).size).toBe(MAX_CARDS_PER_PLAYER);
    expect(first.every((card) => card.markedSongIds.length === 0 && card.songs.length === 12)).toBe(true);
  });
});
