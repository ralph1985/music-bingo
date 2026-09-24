import { describe, expect, it, vi } from "vitest";

import { ConvexCommandError, callSongCommand, createGameCommand, deriveConvexSiteUrl } from "./admin-command";

describe("admin Convex command", () => {
  it("derives the Convex HTTP site URL from the configured cloud URL", () => {
    expect(deriveConvexSiteUrl("https://example.convex.cloud")).toBe("https://example.convex.site");
  });

  it("sends a create request only to the Convex HTTP endpoint with the shared secret", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ joinCode: "FIESTA" }), { status: 201 }));

    await expect(createGameCommand({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      playlist: [{ id: "song-1", title: "La Flaca", artist: "Jarabe de Palo" }],
      joinCode: "FIESTA",
      fetcher,
    })).resolves.toEqual({ joinCode: "FIESTA" });

    expect(fetcher).toHaveBeenCalledWith("https://example.convex.site/admin/games", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-command-secret": "shared-test-secret",
      },
      body: JSON.stringify({
        joinCode: "FIESTA",
        playlist: [{ id: "song-1", title: "La Flaca", artist: "Jarabe de Palo" }],
      }),
    });
  });

  it("does not treat a rejected Convex command as a created game", async () => {
    await expect(createGameCommand({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      playlist: [],
      joinCode: "FIESTA",
      fetcher: vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })),
    })).rejects.toThrow("No se pudo crear la partida");
  });

  it("exposes a collision response so the server can choose another code", async () => {
    await expect(createGameCommand({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      playlist: [],
      joinCode: "FIESTA",
      fetcher: vi.fn().mockResolvedValue(new Response("collision", { status: 409 })),
    })).rejects.toEqual(expect.objectContaining<Partial<ConvexCommandError>>({ status: 409 }));
  });

  it("sends a song call only to the administrative Convex endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(callSongCommand({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      joinCode: "FIESTA",
      songId: "song-1",
      fetcher,
    })).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith("https://example.convex.site/admin/calls", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-command-secret": "shared-test-secret",
      },
      body: JSON.stringify({ joinCode: "FIESTA", songId: "song-1" }),
    });
  });
});
