import { describe, expect, it, vi } from "vitest";

import { SpotifyPlaybackError, startSpotifyTrack } from "./spotify-playback";

describe("Spotify playback", () => {
  it("selects the active device and starts a track URI on it", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ devices: [{ id: "device-1", is_active: true, is_restricted: false }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher,
      trackUri: "spotify:track:track-1",
    })).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenNthCalledWith(1, "https://api.spotify.com/v1/me/player/devices", {
      headers: { authorization: "Bearer access-token" },
      method: "GET",
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.spotify.com/v1/me/player/play?device_id=device-1", {
      body: JSON.stringify({ uris: ["spotify:track:track-1"] }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
      method: "PUT",
    });
  });

  it("retries on another available device when the selected device disappears", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ devices: [{ id: "device-1", is_active: true, is_restricted: false }, { id: "device-2", is_active: false, is_restricted: false }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ devices: [{ id: "device-2", is_active: false, is_restricted: false }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher,
      trackUri: "spotify:track:track-1",
    })).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenLastCalledWith("https://api.spotify.com/v1/me/player/play?device_id=device-2", expect.any(Object));
  });

  it("maps Spotify permission and active-device failures", async () => {
    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      trackUri: "spotify:track:track-1",
    })).rejects.toEqual(new SpotifyPlaybackError("forbidden"));

    await expect(startSpotifyTrack({
      accessToken: "access-token",
      fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ devices: [] }), { status: 200 })),
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
