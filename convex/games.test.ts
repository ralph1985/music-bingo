/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("game storage", () => {
  it("rejects a playlist that cannot generate a 3 by 4 card", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.games.createDemoGame, {
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
      t.mutation(internal.games.createDemoGame, { joinCode: "JOIN-1234", playlist }),
    ).rejects.toThrow("unique identifiers");
  });

  it("returns the existing player card when the same identity joins again", async () => {
    const t = convexTest(schema, modules);
    const playlist = Array.from({ length: 12 }, (_, index) => ({
      artist: `Artista ${index + 1}`,
      id: `song-${index + 1}`,
      title: `Canción ${index + 1}`,
    }));
    await t.mutation(internal.games.createDemoGame, { joinCode: "JOIN-1234", playlist });

    const firstJoin = await t.mutation(internal.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Rafa",
      playerIdentity: "player-identity-1",
    });
    const secondJoin = await t.mutation(internal.games.joinPlayer, {
      joinCode: "JOIN-1234",
      name: "Otro nombre",
      playerIdentity: "player-identity-1",
    });

    expect(secondJoin).toEqual(firstJoin);
  });
});
