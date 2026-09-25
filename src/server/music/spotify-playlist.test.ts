import { describe, expect, it } from "vitest";

import { normalizeSpotifyPlaylistItems, parseSpotifyPlaylistReference } from "./spotify-playlist";

describe("parseSpotifyPlaylistReference", () => {
  it("accepts Spotify playlist URLs and URIs", () => {
    expect(parseSpotifyPlaylistReference("https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk?si=abc"))
      .toEqual({ id: "37i9dQZF1DX4JAvHpjipBk" });
    expect(parseSpotifyPlaylistReference("spotify:playlist:37i9dQZF1DX4JAvHpjipBk"))
      .toEqual({ id: "37i9dQZF1DX4JAvHpjipBk" });
  });

  it("rejects a non-playlist Spotify resource", () => {
    expect(parseSpotifyPlaylistReference("https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy"))
      .toBeNull();
  });
});

describe("normalizeSpotifyPlaylistItems", () => {
  it("keeps playable tracks and reports unsupported playlist items", () => {
    expect(normalizeSpotifyPlaylistItems([
      { item: { id: "track-1", name: "Bailar", type: "track", artists: [{ name: "Artista A" }], uri: "spotify:track:track-1" } },
      { item: { id: "episode-1", name: "Podcast", type: "episode", artists: [], uri: "spotify:episode:episode-1" } },
      { item: null },
    ])).toEqual({
      songs: [{ artist: "Artista A", spotifyUri: "spotify:track:track-1", title: "Bailar" }],
      skipped: 2,
    });
  });
});
