import type { Card, Song } from "./types";

type GenerateCardInput = {
  songs: Song[];
  seed: string;
  rows: number;
  cols: number;
};

export function generateCard({ songs, seed, rows, cols }: GenerateCardInput): Card {
  const size = rows * cols;

  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    throw new Error("El tamaño del cartón debe ser positivo.");
  }

  if (songs.length < size) {
    throw new Error("No hay suficientes canciones para generar el cartón.");
  }

  const shuffledSongs = [...songs];
  const random = createSeededRandom(seed);

  for (let index = shuffledSongs.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledSongs[index], shuffledSongs[swapIndex]] = [
      shuffledSongs[swapIndex],
      shuffledSongs[index],
    ];
  }

  return { rows, cols, songs: shuffledSongs.slice(0, size) };
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
