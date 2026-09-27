import { describe, expect, it } from "vitest";

import { prepareGamePlaylist } from "./game-playlist";

describe("prepareGamePlaylist", () => {
  it("assigns stable identifiers while preserving imported song details", () => {
    const songs = [
      { title: "La Flaca", artist: "Jarabe de Palo" },
      { title: "Dancing Queen", artist: "ABBA" },
    ];

    expect(prepareGamePlaylist(songs, 2)).toEqual([
      { id: "song-1", title: "La Flaca", artist: "Jarabe de Palo" },
      { id: "song-2", title: "Dancing Queen", artist: "ABBA" },
    ]);
    expect(songs).toEqual([
      { title: "La Flaca", artist: "Jarabe de Palo" },
      { title: "Dancing Queen", artist: "ABBA" },
    ]);
  });

  it("preserves Spotify track URIs for playback", () => {
    expect(prepareGamePlaylist([
      { artist: "ABBA", spotifyUri: "spotify:track:track-1", title: "Dancing Queen" },
    ], 1)).toEqual([
      { artist: "ABBA", id: "song-1", spotifyUri: "spotify:track:track-1", title: "Dancing Queen" },
    ]);
  });
});
