import { normalizeSpotifyPlaylistItems, SpotifyImportedSong } from "../music/spotify-playlist";

const SPOTIFY_API = "https://api.spotify.com/v1";
const MAX_PLAYLIST_SONGS = 75;

type SpotifyFetcher = typeof fetch;

type ImportSpotifyPlaylistInput = {
  accessToken: string;
  fetcher?: SpotifyFetcher;
  playlistId: string;
};

export class SpotifyApiError extends Error {
  constructor(readonly code: "access-denied" | "not-found" | "rate-limited" | "unauthorized" | "upstream") {
    super(code);
  }
}

export async function importSpotifyPlaylist({ accessToken, fetcher = fetch, playlistId }: ImportSpotifyPlaylistInput): Promise<{ playlistName: string; skipped: number; songs: SpotifyImportedSong[] }> {
  const headers = { authorization: `Bearer ${accessToken}` };
  const metadata = await spotifyJson(fetcher, `${SPOTIFY_API}/playlists/${encodeURIComponent(playlistId)}?fields=name`, headers);
  if (typeof metadata.name !== "string" || !metadata.name.trim()) {
    throw new SpotifyApiError("upstream");
  }

  let next: string | null = `${SPOTIFY_API}/playlists/${encodeURIComponent(playlistId)}/items?limit=50&fields=items(item(id,name,type,uri,artists(name))),next`;
  const songs: SpotifyImportedSong[] = [];
  let skipped = 0;

  while (next) {
    const page = await spotifyJson(fetcher, next, headers);
    if (!Array.isArray(page.items) || (page.next !== null && typeof page.next !== "string")) {
      throw new SpotifyApiError("upstream");
    }
    const normalized = normalizeSpotifyPlaylistItems(page.items);
    songs.push(...normalized.songs);
    skipped += normalized.skipped;
    if (songs.length > MAX_PLAYLIST_SONGS) {
      throw new SpotifyApiError("upstream");
    }
    next = page.next;
  }

  return { playlistName: metadata.name, skipped, songs };
}

async function spotifyJson(fetcher: SpotifyFetcher, url: string, headers: Record<string, string>): Promise<Record<string, unknown>> {
  const parsedUrl = new URL(url);
  if (parsedUrl.origin !== "https://api.spotify.com") {
    throw new SpotifyApiError("upstream");
  }

  const response = await fetcher(parsedUrl, { headers });
  if (!response.ok) {
    if (response.status === 401) throw new SpotifyApiError("unauthorized");
    if (response.status === 403) throw new SpotifyApiError("access-denied");
    if (response.status === 404) throw new SpotifyApiError("not-found");
    if (response.status === 429) throw new SpotifyApiError("rate-limited");
    throw new SpotifyApiError("upstream");
  }

  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    throw new SpotifyApiError("upstream");
  }
  return body as Record<string, unknown>;
}
