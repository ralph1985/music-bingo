export type SpotifyImportedSong = {
  artist: string;
  spotifyUri: string;
  title: string;
};

type SpotifyPlaylistItem = {
  item?: unknown;
};

export function parseSpotifyPlaylistReference(input: string): { id: string } | null {
  const value = input.trim();
  const uriMatch = /^spotify:playlist:([A-Za-z0-9]+)$/.exec(value);
  if (uriMatch) {
    return { id: uriMatch[1] };
  }

  try {
    const url = new URL(value);
    const pathMatch = /^\/playlist\/([A-Za-z0-9]+)$/.exec(url.pathname);
    return url.hostname === "open.spotify.com" && pathMatch ? { id: pathMatch[1] } : null;
  } catch {
    return null;
  }
}

export function normalizeSpotifyPlaylistItems(items: unknown[]): { songs: SpotifyImportedSong[]; skipped: number } {
  const songs: SpotifyImportedSong[] = [];
  let skipped = 0;

  for (const value of items) {
    const item = (value as SpotifyPlaylistItem | null)?.item;
    if (!isSpotifyTrack(item)) {
      skipped += 1;
      continue;
    }

    songs.push({
      artist: item.artists.map((artist) => artist.name.trim()).filter(Boolean).join(", "),
      spotifyUri: item.uri,
      title: item.name,
    });
  }

  return { songs, skipped };
}

function isSpotifyTrack(value: unknown): value is { artists: { name: string }[]; id: string; name: string; type: "track"; uri: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const track = value as { artists?: unknown; id?: unknown; name?: unknown; type?: unknown; uri?: unknown };
  return track.type === "track"
    && typeof track.id === "string" && Boolean(track.id)
    && typeof track.name === "string" && Boolean(track.name.trim())
    && typeof track.uri === "string" && /^spotify:track:.+$/.test(track.uri)
    && Array.isArray(track.artists)
    && track.artists.some((artist) => typeof artist === "object" && artist !== null && typeof (artist as { name?: unknown }).name === "string" && Boolean((artist as { name: string }).name.trim()));
}
