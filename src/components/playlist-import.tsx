"use client";

import { FormEvent, useEffect, useState } from "react";

import { playerGameUrl } from "../server/games/player-game-url";
import QrCode from "./qr-code";

type Song = { title: string; artist: string };
type ImportResult = { songs: Song[]; errors: { line: number; message: string }[] };

function isSong(value: unknown): value is Song {
  return typeof value === "object" && value !== null
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string";
}

export default function PlaylistImport() {
  const [calledSongIds, setCalledSongIds] = useState<string[]>([]);
  const [createdGame, setCreatedGame] = useState<{ joinCode: string; status: "waiting" | "playing" } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [playlistText, setPlaylistText] = useState("");
  const playerUrl = createdGame ? playerGameUrl(window.location.origin, createdGame.joinCode) : null;

  useEffect(() => {
    const loadGame = () => fetch("/api/admin/games")
      .then(async (response) => response.ok ? await response.json() as { calledSongIds?: unknown; joinCode?: unknown; players?: unknown; playlist?: unknown; status?: unknown } : null)
      .then((game) => {
        if (typeof game?.joinCode === "string" && (game.status === "waiting" || game.status === "playing")) {
          setCreatedGame({ joinCode: game.joinCode, status: game.status });
          if (Array.isArray(game.playlist) && game.playlist.every(isSong)) {
            setResult({ errors: [], songs: game.playlist });
          }
          if (Array.isArray(game.calledSongIds) && game.calledSongIds.every((songId) => typeof songId === "string")) {
            setCalledSongIds(game.calledSongIds);
          }
          if (Array.isArray(game.players)) {
            setPlayerNames(game.players.flatMap((player) => typeof player === "object" && player !== null && typeof (player as { name?: unknown }).name === "string" ? [(player as { name: string }).name] : []));
          }
        }
      });

    void loadGame();
    const interval = window.setInterval(() => void loadGame(), 3_000);
    return () => window.clearInterval(interval);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCreatedGame(null);
    setCalledSongIds([]);
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

    const game = await response.json() as { joinCode: string };
    setCreatedGame({ ...game, status: "waiting" });
  }

  async function startGame() {
    if (!createdGame) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/games/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ joinCode: createdGame.joinCode }),
    });
    setPending(false);
    if (!response.ok) {
      setError("No se pudo iniciar la partida.");
      return;
    }
    setCreatedGame({ ...createdGame, status: "playing" });
  }

  async function callSong(songId: string) {
    if (!createdGame) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ joinCode: createdGame.joinCode, songId }),
    });
    setPending(false);

    if (!response.ok) {
      setError("No se pudo anunciar la canción.");
      return;
    }

    setCalledSongIds((current) => [...current, songId]);
  }

  async function cancelGame() {
    if (!createdGame) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/games", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ joinCode: createdGame.joinCode }),
    });
    setPending(false);

    if (!response.ok) {
      setError("No se pudo cancelar la partida.");
      return;
    }

    setCreatedGame(null);
    setCalledSongIds([]);
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
      <p>{createdGame.status === "waiting" ? "Inscripciones abiertas." : "Partida en curso: inscripciones cerradas."}</p>
      <p>{playerNames.length} jugador{playerNames.length === 1 ? "" : "es"} en sala{playerNames.length ? `: ${playerNames.join(", ")}` : "."}</p>
      <a className="button" href={playerUrl ?? `/play/${createdGame.joinCode}`}>Abrir enlace de jugadores</a>
      {playerUrl ? <QrCode url={playerUrl} /> : null}
      {createdGame.status === "waiting" ? <button className="button" disabled={pending} onClick={startGame} type="button">Iniciar partida y cerrar inscripciones</button> : null}
      <button className="button" disabled={pending} onClick={cancelGame} type="button">Cancelar partida</button>
      <p className="field-label" style={{ marginTop: 18 }}>ANUNCIAR CANCIÓN</p>
      {result?.songs.map((song, index) => {
        const songId = `song-${index + 1}`;
        const called = calledSongIds.includes(songId);

        return <button className="button" disabled={pending || called} key={songId} onClick={() => callSong(songId)} type="button">
          {called ? "Anunciada" : `${song.title} — ${song.artist}`}
        </button>;
      })}
    </div> : null}
  </section>;
}
