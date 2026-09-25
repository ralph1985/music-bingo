import { describe, expect, it, vi } from "vitest";

import { SpotifyApiError, importSpotifyPlaylist } from "./spotify-client";

describe("importSpotifyPlaylist", () => {
  it("imports every playable track across Spotify item pages", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Lista QA" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ item: { id: "a", name: "Uno", type: "track", uri: "spotify:track:a", artists: [{ name: "A" }] } }],
        next: "https://api.spotify.com/v1/playlists/list/items?offset=50",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ item: { id: "b", name: "Dos", type: "track", uri: "spotify:track:b", artists: [{ name: "B" }] } }],
        next: null,
      }), { status: 200 }));

    await expect(importSpotifyPlaylist({ accessToken: "access", playlistId: "list", fetcher }))
      .resolves.toEqual({ playlistName: "Lista QA", skipped: 0, songs: [
        { artist: "A", spotifyUri: "spotify:track:a", title: "Uno" },
        { artist: "B", spotifyUri: "spotify:track:b", title: "Dos" },
      ] });
  });

  it("maps a forbidden playlist to a safe provider error", async () => {
    await expect(importSpotifyPlaylist({
      accessToken: "access",
      playlistId: "private",
      fetcher: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    })).rejects.toEqual(new SpotifyApiError("access-denied"));
  });
});
