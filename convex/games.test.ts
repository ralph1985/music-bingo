/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

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

    expect(player.card.songs).toHaveLength(12);
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
    const songId = joined.card.songs[0].id;

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
    expect(game?.player.markedSongIds).toEqual([]);
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
    const lineSongIds = [0, 3, 6, 9].map((index) => joined.card.songs[index].id);

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

    for (const song of joined.card.songs) {
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
    await t.mutation(internal.games.startGame, { joinCode: "EMPEZAR" });

    await expect(t.mutation(api.games.joinPlayer, {
      joinCode: "EMPEZAR",
      name: "Llega tarde",
      playerIdentity: "late-player",
    })).rejects.toThrow("Game not found.");
  });
});
