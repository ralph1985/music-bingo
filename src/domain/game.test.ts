import { describe, expect, it } from "vitest";

import {
  callSong,
  claimFullCard,
  claimLine,
  createGame,
  markCell,
} from "./game";
import type { Card } from "./types";

const card: Card = {
  rows: 3,
  cols: 4,
  songs: Array.from({ length: 12 }, (_, index) => ({
    id: `song-${index + 1}`,
    title: `Canción ${index + 1}`,
    artist: `Artista ${index + 1}`,
  })),
};

const player = { id: "player-1", name: "Rafa", card };

function gameWithCalledSongs(songIds: string[]) {
  return songIds.reduce(
    (game, songId) => callSong(game, songId),
    createGame([player], card.songs),
  );
}

describe("game rules", () => {
  it("mantiene un marcado idempotente aunque la canción todavía no se haya anunciado", () => {
    const game = createGame([player], card.songs);
    const markedOnce = markCell(game, "player-1", "song-1");
    const markedTwice = markCell(markedOnce, "player-1", "song-1");

    expect(markedTwice.players["player-1"].markedSongIds).toEqual(["song-1"]);
    expect(markedTwice.calledSongIds).toEqual([]);
  });

  it("anuncia cada canción una sola vez", () => {
    const game = createGame([player], card.songs);
    const firstCall = callSong(game, "song-1");

    expect(callSong(firstCall, "song-1").calledSongIds).toEqual(["song-1"]);
  });

  it("ignora una canción que no pertenece a la lista de la partida", () => {
    const game = createGame([player], card.songs);

    expect(callSong(game, "song-que-no-existe")).toEqual(game);
  });

  it("permite anunciar una canción válida aunque no aparezca en ningún cartón", () => {
    const bonusSong = { id: "song-bonus", title: "Canción bonus", artist: "Artista bonus" };
    const game = createGame([player], [...card.songs, bonusSong]);

    expect(callSong(game, "song-bonus").calledSongIds).toEqual(["song-bonus"]);
  });

  it("rechaza un cartón con canciones fuera de la playlist canónica", () => {
    expect(() => createGame([player], card.songs.slice(1))).toThrow(
      "Cada canción del cartón debe pertenecer a la playlist.",
    );
  });

  it("rechaza cartones con geometría inválida o canciones repetidas", () => {
    const emptyCard = { ...card, rows: 1, cols: 0, songs: [] };
    const duplicateCard = { ...card, songs: [...card.songs.slice(0, 11), card.songs[0]] };

    expect(() => createGame([{ ...player, card: emptyCard }], card.songs)).toThrow(
      "El cartón debe tener una geometría y canciones válidas.",
    );
    expect(() => createGame([{ ...player, card: duplicateCard }], card.songs)).toThrow(
      "El cartón debe tener una geometría y canciones válidas.",
    );
  });

  it("concede una única línea válida y mantiene la partida en curso", () => {
    const game = gameWithCalledSongs(["song-1", "song-2", "song-3", "song-4"]);
    const marked = ["song-1", "song-2", "song-3", "song-4"].reduce(
      (state, songId) => markCell(state, "player-1", songId),
      game,
    );

    const claim = claimLine(marked, "player-1");

    expect(claim.outcome).toBe("accepted");
    expect(claim.game.lineWinnerPlayerId).toBe("player-1");
    expect(claim.game.status).toBe("en_curso");
    expect(claimLine(claim.game, "player-1").outcome).toBe("unavailable");
  });

  it("elimina al jugador si reclama una línea inválida", () => {
    const claim = claimLine(createGame([player], card.songs), "player-1");

    expect(claim.outcome).toBe("rejected");
    expect(claim.game.players["player-1"].eliminated).toBe(true);
    expect(markCell(claim.game, "player-1", "song-1")).toEqual(claim.game);
  });

  it("termina la partida cuando valida un cartón completo", () => {
    const songIds = card.songs.map((song) => song.id);
    const marked = songIds.reduce(
      (state, songId) => markCell(state, "player-1", songId),
      gameWithCalledSongs(songIds),
    );

    const claim = claimFullCard(marked, "player-1");

    expect(claim.outcome).toBe("accepted");
    expect(claim.game.fullCardWinnerPlayerId).toBe("player-1");
    expect(claim.game.status).toBe("terminada");
    expect(claim.game.players["player-1"].markedSongIds).toHaveLength(12);
  });
});
