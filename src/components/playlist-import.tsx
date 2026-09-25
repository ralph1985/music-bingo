"use client";

import { FormEvent, useEffect, useState } from "react";

import { playerGameUrl } from "../server/games/player-game-url";
import { AdminGameStatus, AdminTabId, AdminTabs } from "./admin-tabs";
import QrCode from "./qr-code";

type Song = { title: string; artist: string };
type ImportResult = { songs: Song[]; errors: { line: number; message: string }[] };
type AdminPlayer = { id: string; name: string };

export function shouldShowNewGameButton(status: AdminGameStatus | null, tab: AdminTabId): boolean {
  return status === "completed" && tab === "setup";
}

function isSong(value: unknown): value is Song {
  return typeof value === "object" && value !== null
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string";
}

export default function PlaylistImport() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("setup");
  const [calledSongIds, setCalledSongIds] = useState<string[]>([]);
  const [createdGame, setCreatedGame] = useState<{ joinCode: string; status: AdminGameStatus } | null>(null);
  const [dismissedCompletedGameCode, setDismissedCompletedGameCode] = useState<string | null>(null);
  const [fullCardWinnerPlayerId, setFullCardWinnerPlayerId] = useState<string | null>(null);
  const [lineWinnerPlayerId, setLineWinnerPlayerId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [playlistText, setPlaylistText] = useState("");
  const currentJoinCode = createdGame?.joinCode;
  const playerUrl = createdGame ? playerGameUrl(window.location.origin, createdGame.joinCode) : null;

  useEffect(() => {
    const url = currentJoinCode ? `/api/admin/games?joinCode=${encodeURIComponent(currentJoinCode)}` : "/api/admin/games";
    const loadGame = () => fetch(url, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { calledSongIds?: unknown; fullCardWinnerPlayerId?: unknown; joinCode?: unknown; lineWinnerPlayerId?: unknown; players?: unknown; playlist?: unknown; status?: unknown } : null)
      .then((game) => {
        if (typeof game?.joinCode === "string" && (game.status === "waiting" || game.status === "playing" || game.status === "completed") && !(game.status === "completed" && game.joinCode === dismissedCompletedGameCode)) {
          setCreatedGame({ joinCode: game.joinCode, status: game.status });
          if (Array.isArray(game.playlist) && game.playlist.every(isSong)) {
            setResult({ errors: [], songs: game.playlist });
          }
          if (Array.isArray(game.calledSongIds) && game.calledSongIds.every((songId) => typeof songId === "string")) {
            setCalledSongIds(game.calledSongIds);
          }
          setFullCardWinnerPlayerId(typeof game.fullCardWinnerPlayerId === "string" ? game.fullCardWinnerPlayerId : null);
          setLineWinnerPlayerId(typeof game.lineWinnerPlayerId === "string" ? game.lineWinnerPlayerId : null);
          if (Array.isArray(game.players)) {
            setPlayers(game.players.flatMap((player) => typeof player === "object" && player !== null && typeof (player as { id?: unknown; name?: unknown }).id === "string" && typeof (player as { id?: unknown; name?: unknown }).name === "string" ? [{ id: (player as { id: string }).id, name: (player as { name: string }).name }] : []));
          }
        }
      });

    void loadGame();
    const interval = window.setInterval(() => void loadGame(), 3_000);
    return () => window.clearInterval(interval);
  }, [currentJoinCode, dismissedCompletedGameCode]);


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
    setActiveTab("room");
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
    setFullCardWinnerPlayerId(null);
    setLineWinnerPlayerId(null);
    setPlayers([]);
    setActiveTab("setup");
  }

  async function finishGame() {
    if (!createdGame) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/games/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ joinCode: createdGame.joinCode }),
    });
    setPending(false);
    if (!response.ok) {
      setError("No se pudo finalizar la partida.");
      return;
    }
    setCreatedGame({ ...createdGame, status: "completed" });
    setActiveTab("results");
  }

  function winnerName(playerId: string | null): string {
    return players.find((player) => player.id === playerId)?.name ?? "Sin ganador";
  }

  function resetForNewGame() {
    if (createdGame?.status === "completed") {
      setDismissedCompletedGameCode(createdGame.joinCode);
    }
    setCreatedGame(null);
    setCalledSongIds([]);
    setFullCardWinnerPlayerId(null);
    setLineWinnerPlayerId(null);
    setPlayers([]);
    setResult(null);
    setPlaylistText("");
    setActiveTab("setup");
  }

  const playlistSongs = result?.songs.map((song, index) => ({ song, songId: `song-${index + 1}` })) ?? [];
  const calledSongs = playlistSongs.filter(({ songId }) => calledSongIds.includes(songId));
  const pendingSongs = playlistSongs.filter(({ songId }) => !calledSongIds.includes(songId));
  const lastCalledSong = calledSongs.at(-1)?.song;
  const missingPlayersToStart = Math.max(0, 2 - players.length);

  return <section className="panel">
    {error ? <p role="alert">{error}</p> : null}
    <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} status={createdGame?.status ?? null}>
      {{
        setup: createdGame ? <div className="import-result">
          <p className="field-label">LISTA DE LA PARTIDA</p>
          <p><strong>{playlistSongs.length}</strong> canciones preparadas para esta ronda.</p>
          {shouldShowNewGameButton(createdGame.status, "setup") ? <button className="button" onClick={resetForNewGame} type="button">Nueva partida</button> : null}
        </div> : <>
          <p className="field-label">IMPORTAR CANCIONES</p>
          <p>Usa una canción por línea: <code>Título;Artista</code> o <code>Título - Artista</code>. También puedes pegar CSV.</p>
          <p><strong>Mínimo: 24 canciones.</strong> Recomendamos entre 30 y 45 canciones para que los cartones sean más variados, especialmente con grupos grandes.</p>
          <form onSubmit={onSubmit}>
            <label className="field-label" htmlFor="playlist" style={{ marginTop: 18 }}>LISTA DE CANCIONES</label>
            <textarea className="field playlist-input" id="playlist" name="playlist" required rows={8} value={playlistText} onChange={(event) => setPlaylistText(event.target.value)} placeholder={"La Flaca;Jarabe de Palo\nDancing Queen;ABBA"} />
            <button className="button" type="submit" disabled={pending}>{pending ? "Analizando…" : "Previsualizar lista"}</button>
          </form>
          {result ? <div className="import-result">
            <p><strong>{result.songs.length}</strong> canciones válidas</p>
            {result.songs.length > 0 ? <ul>{result.songs.map((song) => <li key={`${song.title}-${song.artist}`}><strong>{song.title}</strong><span>{song.artist}</span></li>)}</ul> : null}
            {result.errors.length > 0 ? <p role="alert">{result.errors.length} filas necesitan revisión.</p> : null}
            {result.errors.length === 0 && result.songs.length >= 24 ? <button className="button" type="button" disabled={pending} onClick={createGame}>{pending ? "Creando…" : "Crear partida"}</button> : <p role="alert">Añade {Math.max(0, 24 - result.songs.length)} canción{result.songs.length === 23 ? "" : "es"} válida{result.songs.length === 23 ? "" : "s"} más para crear la partida.</p>}
          </div> : null}
        </>,
        room: createdGame ? <div className="import-result" role="status">
          <p>Partida creada con código <strong>{createdGame.joinCode}</strong>.</p>
          <p>{createdGame.status === "waiting" ? "Inscripciones abiertas." : createdGame.status === "playing" ? "Partida en curso: inscripciones cerradas." : "Partida finalizada. Consulta los resultados."}</p>
          <p>{players.length} jugador{players.length === 1 ? "" : "es"} en sala{players.length ? `: ${players.map((player) => player.name).join(", ")}` : "."}</p>
          {createdGame.status === "waiting" && missingPlayersToStart > 0 ? <p role="alert">Falta{missingPlayersToStart === 1 ? "" : "n"} {missingPlayersToStart} jugador{missingPlayersToStart === 1 ? "" : "es"} para iniciar la partida. El mínimo es 2.</p> : null}
          <a className="button" href={playerUrl ?? `/play/${createdGame.joinCode}`}>Abrir enlace de jugadores</a>
          {playerUrl ? <QrCode url={playerUrl} /> : null}
          {createdGame.status === "waiting" ? <button className="button" disabled={pending || missingPlayersToStart > 0} onClick={startGame} type="button">Iniciar partida y cerrar inscripciones</button> : null}
          {createdGame.status !== "completed" ? <button className="button" disabled={pending} onClick={finishGame} type="button">Finalizar partida y ver resultados</button> : null}
          {createdGame.status !== "completed" ? <button className="button" disabled={pending} onClick={cancelGame} type="button">Cancelar partida</button> : null}
        </div> : <p>Crea una partida en Preparar para abrir la sala.</p>,
        calls: createdGame?.status === "playing" || createdGame?.status === "completed" ? <div className="import-result">
          {lastCalledSong ? <section className="import-result"><p className="field-label">ÚLTIMA CANCIÓN ANUNCIADA</p><p><strong>{lastCalledSong.title}</strong> — {lastCalledSong.artist}</p></section> : <p>Aún no se ha anunciado ninguna canción.</p>}
          {calledSongs.length > 0 ? <section className="import-result"><p className="field-label">HISTORIAL DE CANCIONES</p><ol>{calledSongs.map(({ song, songId }) => <li key={`called-${songId}`}><strong>{song.title}</strong> — {song.artist}</li>)}</ol></section> : null}
          {createdGame.status === "playing" ? <><p className="field-label" style={{ marginTop: 18 }}>CANCIONES PENDIENTES</p>{pendingSongs.map(({ song, songId }) => <button className="button" disabled={pending} key={songId} onClick={() => callSong(songId)} type="button">{song.title} — {song.artist}</button>)}</> : null}
        </div> : <p>Inicia la partida para empezar a anunciar canciones.</p>,
        results: createdGame?.status === "completed" ? <section className="import-result"><p className="field-label">RESULTADOS</p><p>Línea: <strong>{winnerName(lineWinnerPlayerId)}</strong></p><p>¡Bingo!: <strong>{winnerName(fullCardWinnerPlayerId)}</strong></p><p>{calledSongs.length} canciones anunciadas en total.</p></section> : <p>Los resultados estarán disponibles al finalizar la partida.</p>,
      }}
    </AdminTabs>
  </section>;
}
