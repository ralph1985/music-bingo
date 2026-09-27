const SPOTIFY_PLAY_ENDPOINT = "https://api.spotify.com/v1/me/player/play";
const SPOTIFY_DEVICES_ENDPOINT = "https://api.spotify.com/v1/me/player/devices";

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

  const devices = await getSpotifyDevices({ accessToken, fetcher });
  const device = selectPlaybackDevice(devices);
  if (!device) throw new SpotifyPlaybackError("no-device");

  let response = await playOnDevice({ accessToken, deviceId: device.id, fetcher, trackUri });
  if (response.status === 404) {
    const refreshedDevices = await getSpotifyDevices({ accessToken, fetcher });
    const retryDevice = selectPlaybackDevice(refreshedDevices, device.id);
    if (retryDevice) response = await playOnDevice({ accessToken, deviceId: retryDevice.id, fetcher, trackUri });
  }

  if (response.ok) return;
  throw playbackErrorForStatus(response.status);
}

type SpotifyDevice = { id: string; isActive: boolean; isRestricted: boolean };

async function getSpotifyDevices({ accessToken, fetcher }: { accessToken: string; fetcher: SpotifyFetcher }): Promise<SpotifyDevice[]> {
  const response = await fetcher(SPOTIFY_DEVICES_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    method: "GET",
  });

  if (!response.ok) throw playbackErrorForStatus(response.status);
  const body = await response.json().catch(() => null) as { devices?: unknown } | null;
  if (!Array.isArray(body?.devices)) throw new SpotifyPlaybackError("upstream");

  return body.devices.flatMap((device) => {
    if (typeof device !== "object" || device === null) return [];
    const candidate = device as { id?: unknown; is_active?: unknown; is_restricted?: unknown };
    return typeof candidate.id === "string" && candidate.id.length > 0
      ? [{ id: candidate.id, isActive: candidate.is_active === true, isRestricted: candidate.is_restricted === true }]
      : [];
  });
}

function selectPlaybackDevice(devices: SpotifyDevice[], excludedDeviceId?: string): SpotifyDevice | null {
  return devices.find((device) => device.id !== excludedDeviceId && device.isActive && !device.isRestricted)
    ?? devices.find((device) => device.id !== excludedDeviceId && !device.isRestricted)
    ?? null;
}

async function playOnDevice({ accessToken, deviceId, fetcher, trackUri }: { accessToken: string; deviceId: string; fetcher: SpotifyFetcher; trackUri: string }): Promise<Response> {
  const url = new URL(SPOTIFY_PLAY_ENDPOINT);
  url.searchParams.set("device_id", deviceId);
  return fetcher(url.toString(), {
    body: JSON.stringify({ uris: [trackUri] }),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "PUT",
  });
}

function playbackErrorForStatus(status: number): SpotifyPlaybackError {
  if (status === 401) return new SpotifyPlaybackError("unauthorized");
  if (status === 403) return new SpotifyPlaybackError("forbidden");
  if (status === 404) return new SpotifyPlaybackError("no-device");
  if (status === 429) return new SpotifyPlaybackError("rate-limited");
  return new SpotifyPlaybackError("upstream");
}
