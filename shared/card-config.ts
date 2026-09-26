export const CARD_COLS = 3;
export const CARD_ROWS = 4;
export const CARD_SONGS = CARD_ROWS * CARD_COLS;
export const MAX_CARDS_PER_PLAYER = 4;
export const MIN_CARDS_PER_PLAYER = 1;

export function isValidCardCount(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_CARDS_PER_PLAYER && value <= MAX_CARDS_PER_PLAYER;
}
