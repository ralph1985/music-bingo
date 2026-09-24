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
    const playlist = Array.from({ length: 12 }, (_, index) => ({
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
    const playlist = Array.from({ length: 12 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));

    await t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist });

    await expect(t.mutation(internal.games.createGame, { joinCode: "FIESTA", playlist })).resolves.toBeNull();
    expect(await t.query(internal.games.getByCode, { joinCode: "FIESTA" })).toMatchObject({ playlist });
  });

  it("rejects a playlist that cannot generate a 3 by 4 card", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.games.createGame, {
        joinCode: "JOIN-1234",
        playlist: Array.from({ length: 11 }, (_, index) => ({
          artist: `Artista ${index + 1}`,
          id: `song-${index + 1}`,
          title: `Canción ${index + 1}`,
        })),
      }),
    ).rejects.toThrow("at least 12 songs");
  });

  it("rejects duplicate song identifiers", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 12 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    playlist[11].id = playlist[0].id;

    await expect(
      t.mutation(internal.games.createGame, { joinCode: "JOIN-1234", playlist }),
    ).rejects.toThrow("unique identifiers");
  });

  it("returns the existing player card when the same identity joins again", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 12 }, (_, index) => ({
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
    const playlist = Array.from({ length: 12 }, (_, index) => ({
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

  it("lets a player mark one of their own card songs before it is called", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 12 }, (_, index) => ({
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
    expect(game?.player.markedSongIds).toEqual([songId]);
  });

  it("returns only the player's card and redacted game state", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 13 }, (_, index) => ({
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
});
