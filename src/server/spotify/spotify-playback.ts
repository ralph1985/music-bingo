const SPOTIFY_PLAY_ENDPOINT = "https://api.spotify.com/v1/me/player/play";

type SpotifyFetcher = typeof fetch;

type SpotifyPlaybackErrorCode = "forbidden" | "invalid-track" | "no-device" | "rate-limited" | "unauthorized" | "upstream";

export class SpotifyPlaybackError extends Error {
  constructor(readonly code: SpotifyPlaybackErrorCode) {
    super(code);
  }
}

export async function startSpotifyTrack({ accessToken, fetcher = fetch, trackUri }: { accessToken: string; fetcher?: SpotifyFetcher; trackUri: string }): Promise<void> {
  if (!/^spotify:track:[A-Za-z0-9_-]+$/.test(trackUri)) {
    throw new SpotifyPlaybackError("invalid-track");
  }

  const response = await fetcher(SPOTIFY_PLAY_ENDPOINT, {
    body: JSON.stringify({ uris: [trackUri] }),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "PUT",
  });

  if (response.ok) return;
  if (response.status === 401) throw new SpotifyPlaybackError("unauthorized");
  if (response.status === 403) throw new SpotifyPlaybackError("forbidden");
  if (response.status === 404) throw new SpotifyPlaybackError("no-device");
  if (response.status === 429) throw new SpotifyPlaybackError("rate-limited");
  throw new SpotifyPlaybackError("upstream");
}
