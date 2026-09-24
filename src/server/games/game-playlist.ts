type ImportedSong = {
  title: string;
  artist: string;
};

type GamePlaylistSong = ImportedSong & {
  id: string;
};

export function prepareGamePlaylist(
  songs: ImportedSong[],
  minimumSongs: number,
): GamePlaylistSong[] {
  if (songs.length < minimumSongs) {
    throw new Error(`Se necesitan al menos ${minimumSongs} canciones para crear la partida.`);
  }

  return songs.map((song, index) => ({ ...song, id: `song-${index + 1}` }));
}
