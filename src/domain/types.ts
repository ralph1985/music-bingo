export type Song = {
  id: string;
  title: string;
  artist: string;
};

export type Card = {
  rows: number;
  cols: number;
  songs: Song[];
};

export type GameStatus =
  | "inicio"
  | "creada"
  | "esperando_jugadores"
  | "en_curso"
  | "terminada"
  | "cancelada";

export type PlayerProfile = {
  id: string;
  name: string;
};

export type LocalGame = {
  gameId: string;
  player: PlayerProfile;
  card: Card;
  markedSongIds: string[];
};

export type GamePlayer = PlayerProfile & {
  card: Card;
  markedSongIds: string[];
  eliminated: boolean;
};

export type GameState = {
  status: Extract<GameStatus, "en_curso" | "terminada">;
  players: Record<string, GamePlayer>;
  playlistSongIds: string[];
  calledSongIds: string[];
  lineWinnerPlayerId: string | null;
  fullCardWinnerPlayerId: string | null;
};

export type ClaimOutcome = "accepted" | "rejected" | "unavailable";

export type ClaimResult = {
  game: GameState;
  outcome: ClaimOutcome;
};
