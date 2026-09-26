/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("game storage", () => {
  it("creates an admin game with its requested join code", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));

    await t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist });

    expect(await t.query(internal.games.getByCode, { joinCode: "FIESTA" })).toMatchObject({
      joinCode: "FIESTA",
      playlist,
      status: "waiting",
    });
  });

  it("reports a repeated join code without creating a second game", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));

    await t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist });

    await expect(t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist })).resolves.toBeNull();
    expect(await t.query(internal.games.getByCode, { joinCode: "FIESTA" })).toMatchObject({ playlist });
  });

  it("rejects creating a second active game", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));

    await t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist });

    await expect(t.mutation(internal.games.createGame, { joinCode: "OTRA1", playlist })).resolves.toBeNull();
    expect(await t.query(internal.games.getByCode, { joinCode: "OTRA1" })).toBeNull();
  });

  it("allows a new game after the active game is cancelled", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));

    await t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist });
    await t.mutation(internal.games.cancelGame, { joinCode: "FIESTA" });

    await expect(t.mutation(internal.games.createGame, { joinCode: "OTRA1", playlist })).resolves.not.toBeNull();
  });

  it("finishes an active game and preserves its result state", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "FINALIZA", playlist });

    await t.mutation(internal.games.finishGame, { joinCode: "FINALIZA" });

    await expect(t.query(internal.games.getActiveAdminGame, {})).resolves.toMatchObject({
      game: { joinCode: "FINALIZA", status: "completed" },
    });
    await expect(t.mutation(internal.games.createGame, { joinCode: "OTRA1", playlist })).resolves.not.toBeNull();
  });

  it("records the start and finish times used in the host results", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    vi.setSystemTime(new Date("2026-09-25T18:00:00.000Z"));
    await t.mutation(internal.games.createGame, { joinCode: "HORARIOS", playlist });
    await t.mutation(api.games.joinPlayer, { joinCode: "HORARIOS", name: "Uno", playerIdentity: "time-player-1" });
    await t.mutation(api.games.joinPlayer, { joinCode: "HORARIOS", name: "Dos", playerIdentity: "time-player-2" });

    await t.mutation(internal.games.startGame, { joinCode: "HORARIOS" });
    vi.setSystemTime(new Date("2026-09-25T18:42:00.000Z"));
    await t.mutation(internal.games.finishGame, { joinCode: "HORARIOS" });

    await expect(t.query(internal.games.getByCode, { joinCode: "HORARIOS" })).resolves.toMatchObject({
      startedAt: new Date("2026-09-25T18:00:00.000Z").getTime(),
      completedAt: new Date("2026-09-25T18:42:00.000Z").getTime(),
      status: "completed",
    });
    vi.useRealTimers();
  });

  it("blocks card changes and claims after the host finishes a game", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "CERRADA", playlist });
    const player = await t.mutation(api.games.joinPlayer, {
      joinCode: "CERRADA",
      name: "Rafa",
      playerIdentity: "finished-game-player",
    });
    await t.mutation(internal.games.finishGame, { joinCode: "CERRADA" });

    await expect(t.mutation(api.games.markCell, {
      joinCode: "CERRADA",
      playerIdentity: "finished-game-player",
      songId: player.cards[0].songs[0].id,
    })).rejects.toThrow("Game is not active.");
    await expect(t.mutation(api.games.claimLine, {
      joinCode: "CERRADA",
      playerIdentity: "finished-game-player",
    })).resolves.toEqual({ outcome: "unavailable" });
  });

  it("returns completed game details to the host by join code", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "RESULTAD", playlist });
    await t.mutation(api.games.joinPlayer, {
      joinCode: "RESULTAD",
      name: "Rafa",
      playerIdentity: "host-result-player",
    });
    await t.mutation(internal.games.finishGame, { joinCode: "RESULTAD" });

    await expect(t.query(internal.games.getAdminGameByCode, { joinCode: "RESULTAD" })).resolves.toMatchObject({
      game: { joinCode: "RESULTAD", status: "completed" },
      players: [{ name: "Rafa" }],
    });
  });

  it("runs a complete round across two independently joined players", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "DOSJUG", playlist });
    const firstPlayer = await t.mutation(api.games.joinPlayer, {
      joinCode: "DOSJUG",
      name: "Línea",
      playerIdentity: "line-player",
    });
    const secondPlayer = await t.mutation(api.games.joinPlayer, {
      joinCode: "DOSJUG",
      name: "Bingo",
      playerIdentity: "bingo-player",
    });
    await t.mutation(internal.games.startGame, { joinCode: "DOSJUG" });

    const lineSongIds = [0, 3, 6, 9].map((index) => firstPlayer.cards[0].songs[index].id);
    for (const songId of new Set([...lineSongIds, ...secondPlayer.cards[0].songs.map((song) => song.id)])) {
      await t.mutation(internal.games.callSong, { joinCode: "DOSJUG", songId });
    }
    for (const songId of lineSongIds) {
      await t.mutation(api.games.markCell, { joinCode: "DOSJUG", playerIdentity: "line-player", songId });
    }
    await expect(t.mutation(api.games.claimLine, {
      joinCode: "DOSJUG",
      playerIdentity: "line-player",
    })).resolves.toEqual({ outcome: "won" });

    for (const song of secondPlayer.cards[0].songs) {
      await t.mutation(api.games.markCell, { joinCode: "DOSJUG", playerIdentity: "bingo-player", songId: song.id });
    }
    await expect(t.mutation(api.games.claimFullCard, {
      joinCode: "DOSJUG",
      playerIdentity: "bingo-player",
    })).resolves.toEqual({ outcome: "won" });

    await expect(t.query(internal.games.getAdminGameByCode, { joinCode: "DOSJUG" })).resolves.toMatchObject({
      game: { status: "completed" },
      players: [{ name: "Línea" }, { name: "Bingo" }],
    });
  });

  it("does not start a round until two distinct players have joined", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "MINIMO", playlist });
    await t.mutation(api.games.joinPlayer, {
      joinCode: "MINIMO",
      name: "Solo uno",
      playerIdentity: "single-player",
    });

    await expect(t.mutation(internal.games.startGame, { joinCode: "MINIMO" })).rejects.toThrow("at least 2 players");
    await expect(t.query(internal.games.getByCode, { joinCode: "MINIMO" })).resolves.toMatchObject({ status: "waiting" });
  });

  it("rejects a playlist with fewer than 24 songs", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.games.createGame, {
        joinCode: "JOIN-1234",
        playlist: Array.from({ length: 23 }, (_, index) => ({
          artist: `Artista ${index + 1}`,
          id: `song-${index + 1}`,
          title: `Canción ${index + 1}`,
        })),
      }),
    ).rejects.toThrow("at least 24 songs");
  });

  it("reports whether a join code can still accept players without exposing the game", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "ABIERTA", playlist });

    await expect(t.query(api.games.getJoinAvailability, { joinCode: "ABIERTA" })).resolves.toEqual({ available: true });
    await expect(t.query(api.games.getJoinAvailability, { joinCode: "INEXISTENTE" })).resolves.toEqual({ available: false });

    await t.mutation(api.games.joinPlayer, { joinCode: "ABIERTA", name: "Primero", playerIdentity: "availability-player-1" });
    await t.mutation(api.games.joinPlayer, { joinCode: "ABIERTA", name: "Segundo", playerIdentity: "availability-player-2" });

    await t.mutation(internal.games.startGame, { joinCode: "ABIERTA" });

    await expect(t.query(api.games.getJoinAvailability, { joinCode: "ABIERTA" })).resolves.toEqual({ available: false });
  });

  it("rejects duplicate song identifiers", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    playlist[11].id = playlist[0].id;

    await expect(
      t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist }),
    ).rejects.toThrow("unique identifiers");
  });

  it("deals a 12-song card from a 24-song playlist", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "CARTON24", playlist });

    const player = await t.mutation(api.games.joinPlayer, {
      joinCode: "CARTON24",
      name: "Rafa",
      playerIdentity: "player-identity-card",
    });

    expect(player.cards[0].songs).toHaveLength(12);
  });

  it("returns the existing player card when the same identity joins again", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });

    const firstJoin = await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });
    const secondJoin = await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Otro nombre",
      playerIdentity: "player-identity-1",
    });

    expect(secondJoin).toEqual(firstJoin);
  });

  it("rejects a blank player name", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });

    await expect(
      t.mutation(api.games.joinPlayer, {
        joinCode: "JOIN-1234",
        name: "   ",
        playerIdentity: "player-identity-1",
      }),
    ).rejects.toThrow("Player name");
  });

  it("lets a player freely correct marks on their own card before claiming", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });
    const joined = await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });
    const songId = joined.cards[0].songs[0].id;

    await t.mutation(api.games.markCell, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
      songId,
    });
    await t.mutation(api.games.markCell, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
      songId,
    });

    const game = await t.query(api.games.getPlayerGame, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
    });
    expect(game?.player.cards[0].markedSongIds).toEqual([]);
  });

  it("accepts the first valid vertical line claim for called and marked card songs", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });
    const joined = await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });
    const lineSongIds = [0, 3, 6, 9].map((index) => joined.cards[0].songs[index].id);

    for (const songId of lineSongIds) {
      await t.mutation(internal.games.callSong, { joinCode: "JOIN-1234", songId });
      await t.mutation(api.games.markCell, { joinCode: "JOIN-1234", playerIdentity: "player-identity-1", songId });
    }

    await expect(t.mutation(api.games.claimLine, { joinCode: "JOIN-1234", playerIdentity: "player-identity-1" })).resolves.toEqual({ outcome: "won" });
    const game = await t.query(api.games.getPlayerGame, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
    });
    expect(game?.game.lineClaimed).toBe(true);
    expect(game?.player.eliminated).toBe(false);
  });

  it("completes the game for the first valid full-card claim", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });
    const joined = await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });

    for (const song of joined.cards[0].songs) {
      await t.mutation(internal.games.callSong, { joinCode: "JOIN-1234", songId: song.id });
      await t.mutation(api.games.markCell, { joinCode: "JOIN-1234", playerIdentity: "player-identity-1", songId: song.id });
    }

    await expect(t.mutation(api.games.claimFullCard, { joinCode: "JOIN-1234", playerIdentity: "player-identity-1" })).resolves.toEqual({ outcome: "won" });
    const game = await t.query(api.games.getPlayerGame, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
    });
    expect(game?.game.fullCardClaimed).toBe(true);
    expect(game?.game.status).toBe("completed");
  });

  it("returns only the player's card and redacted game state", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist });
    await t.mutation(api.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });
    await t.mutation(internal.games.callSong, {
      joinCode: "JOIN-1234",
      songId: "song-1",
    });

    const game = await t.query(api.games.getPlayerGame, {
      joinCode: "JOIN-1234",
      playerIdentity: "player-identity-1",
    });

    expect(game).toMatchObject({
      game: { calledSongCount: 1, status: "playing" },
      player: { name: "Rafa" },
    });
    expect(game?.game).not.toHaveProperty("calledSongIds");
  });

  it("closes new joins when the host starts the round before any song is called", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({ artist: `Artista ${index}`, id: `song-${index}`, title: `Canción ${index}` }));
    await t.mutation(internal.games.createGame, { joinCode: "EMPEZAR", playlist });
    await t.mutation(api.games.joinPlayer, { joinCode: "EMPEZAR", name: "Primero", playerIdentity: "start-player-1" });
    await t.mutation(api.games.joinPlayer, { joinCode: "EMPEZAR", name: "Segundo", playerIdentity: "start-player-2" });
    await t.mutation(internal.games.startGame, { joinCode: "EMPEZAR" });

    await expect(t.mutation(api.games.joinPlayer, {
      joinCode: "EMPEZAR",
      name: "Llega tarde",
      playerIdentity: "late-player",
    })).rejects.toThrow("Game not found.");
  });

  it("deals independent cards and validates claims on any selected card", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 24 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createGame, { joinCode: "MULTI01", playlist });
    const joined = await t.mutation(api.games.joinPlayer, {
      cardCount: 2,
      joinCode: "MULTI01",
      name: "Rafa",
      playerIdentity: "multi-player",
    });

    expect(joined.cards).toHaveLength(2);
    expect(joined.cards[0].id).not.toBe(joined.cards[1].id);

    for (const song of joined.cards[1].songs) {
      await t.mutation(internal.games.callSong, { joinCode: "MULTI01", songId: song.id });
      await t.mutation(api.games.markCell, {
        cardId: joined.cards[1].id,
        joinCode: "MULTI01",
        playerIdentity: "multi-player",
        songId: song.id,
      });
    }

    await expect(t.mutation(api.games.claimFullCard, {
      joinCode: "MULTI01",
      playerIdentity: "multi-player",
    })).resolves.toEqual({ outcome: "won" });
    await expect(t.query(internal.games.getByCode, { joinCode: "MULTI01" })).resolves.toMatchObject({
      fullCardWinnerCardId: joined.cards[1].id,
      status: "completed",
    });
  });
});
