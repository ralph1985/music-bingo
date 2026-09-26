import { CARD_COLS, CARD_ROWS, CARD_SONGS, MAX_CARDS_PER_PLAYER } from "./card-config";

export { CARD_COLS, CARD_ROWS, CARD_SONGS, MAX_CARDS_PER_PLAYER };

export type CardSong = { artist: string; id: string; title: string };

export type GeneratedCard = {
  id: string;
  markedSongIds: string[];
  songs: CardSong[];
};

type GenerateCardsInput = {
  cardCount: number;
  playerIdentity: string;
  playlist: CardSong[];
};

export function generateCards({ cardCount, playerIdentity, playlist }: GenerateCardsInput): GeneratedCard[] {
  if (playlist.length < CARD_SONGS) {
    throw new Error("No hay suficientes canciones para generar el cartón.");
  }

  const cards: GeneratedCard[] = [];
  const sequences = new Set<string>();

  for (let ordinal = 0; ordinal < cardCount; ordinal += 1) {
    const id = `card-${stableDigest(playerIdentity)}-${ordinal + 1}`;
    let songs: CardSong[] | null = null;

    for (let variant = 0; variant < 100; variant += 1) {
      const candidate = shuffle(playlist, `${playerIdentity}|${id}|variant:${variant}`).slice(0, CARD_SONGS);
      const sequence = candidate.map((song) => song.id).join("|");
      if (!sequences.has(sequence)) {
        sequences.add(sequence);
        songs = candidate;
        break;
      }
    }

    if (!songs) {
      throw new Error("No se pudieron generar cartones distintos para esta playlist.");
    }

    cards.push({ id, markedSongIds: [], songs });
  }

  return cards;
}

export function createSeededRandom(seed: string): () => number {
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

function shuffle<T>(values: T[], seed: string): T[] {
  const shuffled = [...values];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function stableDigest(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
