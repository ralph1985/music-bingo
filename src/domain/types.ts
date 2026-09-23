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
