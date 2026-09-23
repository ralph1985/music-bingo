import { describe, expect, it } from "vitest";

import { generateCard } from "./cards";

const songs = Array.from({ length: 12 }, (_, index) => ({
  id: `song-${index + 1}`,
  title: `Canción ${index + 1}`,
  artist: `Artista ${index + 1}`,
}));

describe("generateCard", () => {
  it("genera 12 canciones sin repetir para un cartón de 3 × 4", () => {
    const card = generateCard({ songs, seed: "jugador-uno", rows: 3, cols: 4 });

    expect(card.songs).toHaveLength(12);
    expect(new Set(card.songs.map((song) => song.id)).size).toBe(12);
  });

  it("cambia la selección al usar una semilla de jugador diferente", () => {
    const expandedSongs = [
      ...songs,
      { id: "song-13", title: "Canción 13", artist: "Artista 13" },
      { id: "song-14", title: "Canción 14", artist: "Artista 14" },
      { id: "song-15", title: "Canción 15", artist: "Artista 15" },
    ];

    const firstCard = generateCard({
      songs: expandedSongs,
      seed: "jugador-uno",
      rows: 3,
      cols: 4,
    });
    const secondCard = generateCard({
      songs: expandedSongs,
      seed: "jugador-dos",
      rows: 3,
      cols: 4,
    });

    expect(secondCard.songs.map((song) => song.id)).not.toEqual(
      firstCard.songs.map((song) => song.id),
    );
  });

  it("repite el mismo cartón con la misma semilla y lista ordenada", () => {
    const expandedSongs = [
      ...songs,
      { id: "song-13", title: "Canción 13", artist: "Artista 13" },
      { id: "song-14", title: "Canción 14", artist: "Artista 14" },
    ];

    const firstCard = generateCard({
      songs: expandedSongs,
      seed: "jugador-uno",
      rows: 3,
      cols: 4,
    });
    const replayedCard = generateCard({
      songs: expandedSongs,
      seed: "jugador-uno",
      rows: 3,
      cols: 4,
    });

    expect(replayedCard).toEqual(firstCard);
  });

  it("rechaza una lista con menos canciones que casillas", () => {
    expect(() =>
      generateCard({ songs: songs.slice(0, 11), seed: "jugador-uno", rows: 3, cols: 4 }),
    ).toThrow("No hay suficientes canciones para generar el cartón.");
  });
});
