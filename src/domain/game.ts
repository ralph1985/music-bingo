import type { Card, ClaimResult, GamePlayer, GameState, PlayerProfile, Song } from "./types";

type GamePlayerInput = PlayerProfile & { card: Card };

export function createGame(players: GamePlayerInput[], playlistSongs: Song[]): GameState {
  const playlistSongIds = validatedSongIds(playlistSongs);
  const gamePlayers: Record<string, GamePlayer> = {};

  for (const player of players) {
    if (gamePlayers[player.id]) {
      throw new Error("Cada jugador debe tener una identidad única.");
    }

    validateCard(player.card);
    gamePlayers[player.id] = { ...player, markedSongIds: [], eliminated: false };
  }

  for (const player of Object.values(gamePlayers)) {
    if (player.card.songs.some((song) => !playlistSongIds.includes(song.id))) {
      throw new Error("Cada canción del cartón debe pertenecer a la playlist.");
    }
  }

  return {
    status: "en_curso",
    players: gamePlayers,
    playlistSongIds,
    calledSongIds: [],
    lineWinnerPlayerId: null,
    fullCardWinnerPlayerId: null,
  };
}

export function markCell(game: GameState, playerId: string, songId: string): GameState {
  const player = game.players[playerId];

  if (!player || player.eliminated || game.status !== "en_curso" || !hasSong(player.card, songId)) {
    return game;
  }

  if (player.markedSongIds.includes(songId)) {
    return game;
  }

  return withPlayer(game, playerId, { ...player, markedSongIds: [...player.markedSongIds, songId] });
}

export function callSong(game: GameState, songId: string): GameState {
  if (
    game.status !== "en_curso" ||
    game.calledSongIds.includes(songId) ||
    !game.playlistSongIds.includes(songId)
  ) {
    return game;
  }

  return { ...game, calledSongIds: [...game.calledSongIds, songId] };
}

export function claimLine(game: GameState, playerId: string): ClaimResult {
  if (game.lineWinnerPlayerId) {
    return { game, outcome: "unavailable" };
  }

  return claim(game, playerId, hasCompleteLine, (nextGame) => ({
    ...nextGame,
    lineWinnerPlayerId: playerId,
  }));
}

export function claimFullCard(game: GameState, playerId: string): ClaimResult {
  return claim(game, playerId, hasCompleteCard, (nextGame) => ({
    ...nextGame,
    status: "terminada",
    fullCardWinnerPlayerId: playerId,
  }));
}

function claim(
  game: GameState,
  playerId: string,
  isValid: (player: GamePlayer, calledSongIds: string[]) => boolean,
  accept: (game: GameState) => GameState,
): ClaimResult {
  const player = game.players[playerId];

  if (!player || player.eliminated || game.status !== "en_curso") {
    return { game, outcome: "unavailable" };
  }

  if (isValid(player, game.calledSongIds)) {
    return { game: accept(game), outcome: "accepted" };
  }

  return {
    game: withPlayer(game, playerId, { ...player, eliminated: true }),
    outcome: "rejected",
  };
}

function hasCompleteLine(player: GamePlayer, calledSongIds: string[]): boolean {
  for (let row = 0; row < player.card.rows; row += 1) {
    const rowSongIds = player.card.songs
      .slice(row * player.card.cols, (row + 1) * player.card.cols)
      .map((song) => song.id);

    if (rowSongIds.every((songId) => isMarkedAndCalled(player, calledSongIds, songId))) {
      return true;
    }
  }

  return false;
}

function hasCompleteCard(player: GamePlayer, calledSongIds: string[]): boolean {
  return player.card.songs.every((song) => isMarkedAndCalled(player, calledSongIds, song.id));
}

function isMarkedAndCalled(player: GamePlayer, calledSongIds: string[], songId: string): boolean {
  return player.markedSongIds.includes(songId) && calledSongIds.includes(songId);
}

function hasSong(card: Card, songId: string): boolean {
  return card.songs.some((song) => song.id === songId);
}

function validatedSongIds(songs: Song[]): string[] {
  const songIds = songs.map((song) => song.id);

  if (
    songIds.some((songId) => songId.length === 0 || songId !== songId.trim()) ||
    new Set(songIds).size !== songIds.length
  ) {
    throw new Error("La lista de canciones debe tener identificadores únicos.");
  }

  return songIds;
}

function validateCard(card: Card): void {
  const expectedSongCount = card.rows * card.cols;
  const cardSongIds = card.songs.map((song) => song.id);

  if (
    !Number.isInteger(card.rows) ||
    !Number.isInteger(card.cols) ||
    card.rows <= 0 ||
    card.cols <= 0 ||
    card.songs.length !== expectedSongCount ||
    new Set(cardSongIds).size !== cardSongIds.length
  ) {
    throw new Error("El cartón debe tener una geometría y canciones válidas.");
  }
}

function withPlayer(game: GameState, playerId: string, player: GamePlayer): GameState {
  return { ...game, players: { ...game.players, [playerId]: player } };
}