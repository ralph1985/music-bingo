import { describe, expect, it, vi } from "vitest";

import { createAdminGame } from "./create-admin-game";

describe("createAdminGame", () => {
  const playlistText = Array.from(
    { length: 12 },
    (_, index) => `Canción ${index + 1};Artista ${index + 1}`,
  ).join("\n");

  it("retries a collision and returns the created join code", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("collision", { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ joinCode: "GHJKLM" }), { status: 201 }));

    await expect(createAdminGame({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      text: playlistText,
      fetcher,
      randomBytes: () => new Uint8Array([6, 7, 8, 9, 10, 11]),
    })).resolves.toEqual({ joinCode: "GHJKLM" });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects an import with invalid rows before calling Convex", async () => {
    const fetcher = vi.fn();

    await expect(createAdminGame({
      cloudUrl: "https://example.convex.cloud",
      secret: "shared-test-secret",
      text: `${playlistText}\nInválida`,
      fetcher,
    })).rejects.toThrow("corrige las filas inválidas");

    expect(fetcher).not.toHaveBeenCalled();
  });
});
