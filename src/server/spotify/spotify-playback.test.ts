import { describe, expect, it, vi } from "vitest";

import { SpotifyPlaybackError, startSpotifyTrack } from "./spotify-playback";

describe("Spotify playback", () => {
  it("starts a track URI on the user's active device", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher,
      trackUri: "spotify:track:track-1",
    })).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith("https://api.spotify.com/v1/me/player/play", {
      body: JSON.stringify({ uris: ["spotify:track:track-1"] }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
      method: "PUT",
    });
  });

  it("maps Spotify permission and active-device failures", async () => {
    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      trackUri: "spotify:track:track-1",
    })).rejects.toEqual(new SpotifyPlaybackError("forbidden"));

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
      trackUri: "spotify:track:track-1",
    })).rejects.toEqual(new SpotifyPlaybackError("no-device"));
  });

  it("rejects non-track Spotify URIs before making a request", async () => {
    const fetcher = vi.fn();

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher,
      trackUri: "spotify:playlist:playlist-1",
    })).rejects.toEqual(new SpotifyPlaybackError("invalid-track"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
