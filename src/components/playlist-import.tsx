"use client";

import { FormEvent, useState } from "react";

type Song = { title: string; artist: string };
type ImportResult = { songs: Song[]; errors: { line: number; message: string }[] };

export default function PlaylistImport() {
  const [createdGame, setCreatedGame] = useState<{ joinCode: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [playlistText, setPlaylistText] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCreatedGame(null);
    const text = new FormData(event.currentTarget).get("playlist");
    const response = await fetch("/api/admin/import-playlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setPending(false);

    if (!response.ok) {
      setError("No se pudo importar la lista.");
      return;
    }

    setResult(await response.json() as ImportResult);
  }

  async function createGame() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: playlistText }),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json() as { error?: string };
      setError(body.error ?? "No se pudo crear la partida.");
      return;
    }

    setCreatedGame(await response.json() as { joinCode: string });
  }

  return <section className="panel">
    <p className="field-label">IMPORTAR CANCIONES</p>
    <p>Usa una canción por línea: <code>Título;Artista</code> o <code>Título - Artista</code>. También puedes pegar CSV.</p>
    <form onSubmit={onSubmit}>
      <label className="field-label" htmlFor="playlist" style={{ marginTop: 18 }}>LISTA DE CANCIONES</label>
      <textarea className="field playlist-input" id="playlist" name="playlist" required rows={8} value={playlistText} onChange={(event) => setPlaylistText(event.target.value)} placeholder={"La Flaca;Jarabe de Palo\nDancing Queen;ABBA"} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Analizando…" : "Previsualizar lista"}</button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {result ? <div className="import-result">
      <p><strong>{result.songs.length}</strong> canciones válidas</p>
      {result.songs.length > 0 ? <ul>{result.songs.map((song) => <li key={`${song.title}-${song.artist}`}><strong>{song.title}</strong><span>{song.artist}</span></li>)}</ul> : null}
      {result.errors.length > 0 ? <p role="alert">{result.errors.length} filas necesitan revisión.</p> : null}
      {result.errors.length === 0 && result.songs.length >= 12 ? <button className="button" type="button" disabled={pending} onClick={createGame}>{pending ? "Creando…" : "Crear partida"}</button> : null}
    </div> : null}
    {createdGame ? <div className="import-result" role="status">
      <p>Partida creada con código <strong>{createdGame.joinCode}</strong>.</p>
      <a className="button" href={`/play/${createdGame.joinCode}`}>Abrir enlace de jugadores</a>
    </div> : null}
  </section>;
}
