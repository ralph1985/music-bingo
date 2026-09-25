"use client";

import { FormEvent, useEffect, useState } from "react";

import { playerGameUrl } from "../server/games/player-game-url";
import { AdminGameStatus, AdminTabId, AdminTabs } from "./admin-tabs";
import { GameLifecycle, PlayerLobby, ResultCelebration } from "./host-game-status";
import { Icon } from "./icons";
import QrCode from "./qr-code";

type Song = { title: string; artist: string };
type ImportResult = { songs: Song[]; errors: { line: number; message: string }[] };
type AdminPlayer = { id: string; name: string };
type RoomAction = "starting" | "finishing" | "cancelling" | null;

export function shouldShowNewGameButton(status: AdminGameStatus | null, tab: AdminTabId): boolean {
  return status === "completed" && tab === "setup";
}

export function SpotifyImportFeedback({ message }: { message: string | null }) {
  return message ? <p className="spotify-import-feedback" role="alert" aria-live="assertive">{message}</p> : null;
}

export function CancelGameConfirmation({ onCancel, onConfirm, pending }: { onCancel: () => void; onConfirm: () => void; pending: boolean }) {
  return <section aria-labelledby="cancel-game-title" aria-modal="false" className="cancel-game-confirmation" role="alertdialog">
    <p className="field-label" id="cancel-game-title">CANCELAR PARTIDA</p>
    <p>Se cerrarán las inscripciones y esta ronda no podrá reanudarse.</p>
    <button className="button button-danger" disabled={pending} onClick={onConfirm} type="button"><Icon name="x-circle" /> {pending ? "Cancelando…" : "Cancelar partida definitivamente"}</button>
    <button className="button button-secondary" disabled={pending} onClick={onCancel} type="button"><Icon name="check" /> Mantener partida</button>
  </section>;
}

export function formatGameTimestamp(timestamp: number | null): string {
  return timestamp === null ? "No registrado" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export function buildGameSummary({ bingoWinner, calledSongs, completedAt, joinCode, lineWinner, startedAt }: { bingoWinner: string; calledSongs: Song[]; completedAt: number | null; joinCode: string; lineWinner: string; startedAt: number | null }): string {
  return [
    `RESULTADOS · ${joinCode}`,
    `Inicio: ${formatGameTimestamp(startedAt)}`,
    `Fin: ${formatGameTimestamp(completedAt)}`,
    `Línea: ${lineWinner}`,
    `¡Bingo!: ${bingoWinner}`,
    "",
    "Canciones anunciadas:",
    ...calledSongs.map((song) => `${song.title} — ${song.artist}`),
  ].join("\n");
}

function isSong(value: unknown): value is Song {
  return typeof value === "object" && value !== null
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string";
}

export default function PlaylistImport() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("setup");
  const [calledSongIds, setCalledSongIds] = useState<string[]>([]);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [createdGame, setCreatedGame] = useState<{ joinCode: string; status: AdminGameStatus } | null>(null);
  const [dismissedCompletedGameCode, setDismissedCompletedGameCode] = useState<string | null>(null);
  const [fullCardWinnerPlayerId, setFullCardWinnerPlayerId] = useState<string | null>(null);
  const [lineWinnerPlayerId, setLineWinnerPlayerId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [playlistText, setPlaylistText] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyPlaylist, setSpotifyPlaylist] = useState("");
  const [roomAction, setRoomAction] = useState<RoomAction>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const currentJoinCode = createdGame?.joinCode;
  const playerUrl = createdGame ? playerGameUrl(window.location.origin, createdGame.joinCode) : null;

  useEffect(() => {
    const url = currentJoinCode ? `/api/admin/games?joinCode=${encodeURIComponent(currentJoinCode)}` : "/api/admin/games";
    const loadGame = () => fetch(url, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { calledSongIds?: unknown; completedAt?: unknown; fullCardWinnerPlayerId?: unknown; joinCode?: unknown; lineWinnerPlayerId?: unknown; players?: unknown; playlist?: unknown; startedAt?: unknown; status?: unknown } : null)
      .then((game) => {
        if (typeof game?.joinCode === "string" && (game.status === "waiting" || game.status === "playing" || game.status === "completed") && !(game.status === "completed" && game.joinCode === dismissedCompletedGameCode)) {
          setCreatedGame({ joinCode: game.joinCode, status: game.status });
          if (Array.isArray(game.playlist) && game.playlist.every(isSong)) {
            setResult({ errors: [], songs: game.playlist });
          }
          if (Array.isArray(game.calledSongIds) && game.calledSongIds.every((songId) => typeof songId === "string")) {
            setCalledSongIds(game.calledSongIds);
          }
          setCompletedAt(typeof game.completedAt === "number" ? game.completedAt : null);
          setFullCardWinnerPlayerId(typeof game.fullCardWinnerPlayerId === "string" ? game.fullCardWinnerPlayerId : null);
          setLineWinnerPlayerId(typeof game.lineWinnerPlayerId === "string" ? game.lineWinnerPlayerId : null);
          setStartedAt(typeof game.startedAt === "number" ? game.startedAt : null);
          if (Array.isArray(game.players)) {
            setPlayers(game.players.flatMap((player) => typeof player === "object" && player !== null && typeof (player as { id?: unknown; name?: unknown }).id === "string" && typeof (player as { id?: unknown; name?: unknown }).name === "string" ? [{ id: (player as { id: string }).id, name: (player as { name: string }).name }] : []));
          }
        }
      });

    void loadGame();
    const interval = window.setInterval(() => void loadGame(), 3_000);
    return () => window.clearInterval(interval);
  }, [currentJoinCode, dismissedCompletedGameCode]);

  useEffect(() => {
    void fetch("/api/admin/spotify/status", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { connected?: unknown } : null)
      .then((status) => setSpotifyConnected(status?.connected === true));
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
    setActiveTab("room");
  }

  async function importSpotifyPlaylist() {
    setPending(true);
    setError(null);
    setSpotifyError(null);
    try {
      const response = await fetch("/api/admin/import-spotify-playlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playlist: spotifyPlaylist }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        setSpotifyError(typeof body?.error === "string" ? body.error : "No se pudo importar la playlist de Spotify.");
        return;
      }

      const body = await response.json() as { songs?: unknown };
      const songs = Array.isArray(body.songs) ? body.songs.flatMap((song) => isSong(song) ? [song] : []) : [];
      if (songs.length !== (Array.isArray(body.songs) ? body.songs.length : 0)) {
        setSpotifyError("Spotify devolvió una playlist inválida.");
        return;
      }
      setPlaylistText(songs.map((song) => `${song.title};${song.artist}`).join("\n"));
      setResult({ errors: [], songs });
      setSpotifyPlaylist("");
    } catch {
      setSpotifyError("No se pudo contactar con Spotify. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function startGame() {
    if (!createdGame) return;
    setPending(true);
    setError(null);
    setRoomAction("starting");
    try {
      const response = await fetch("/api/admin/games/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: createdGame.joinCode }),
      });
      if (!response.ok) {
        setError("No se pudo iniciar la partida.");
        return;
      }
      setCreatedGame({ ...createdGame, status: "playing" });
    } catch {
      setError("No se pudo contactar con la sala. Inténtalo de nuevo.");
    } finally {
      setPending(false);
      setRoomAction(null);
    }
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
    setRoomAction("cancelling");
    try {
      const response = await fetch("/api/admin/games", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: createdGame.joinCode }),
      });
      if (!response.ok) {
        setError("No se pudo cancelar la partida.");
        return;
      }

      setCancelConfirmationOpen(false);
      setCompletedAt(null);
      setCreatedGame(null);
      setCalledSongIds([]);
      setFullCardWinnerPlayerId(null);
      setLineWinnerPlayerId(null);
      setPlayers([]);
      setStartedAt(null);
      setActiveTab("setup");
    } catch {
      setError("No se pudo contactar con la sala. Inténtalo de nuevo.");
    } finally {
      setPending(false);
      setRoomAction(null);
    }
  }

  async function finishGame() {
    if (!createdGame) return;
    setPending(true);
    setError(null);
    setRoomAction("finishing");
    try {
      const response = await fetch("/api/admin/games/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: createdGame.joinCode }),
      });
      if (!response.ok) {
        setError("No se pudo finalizar la partida.");
        return;
      }
      setCreatedGame({ ...createdGame, status: "completed" });
      setActiveTab("results");
    } catch {
      setError("No se pudo contactar con la sala. Inténtalo de nuevo.");
    } finally {
      setPending(false);
      setRoomAction(null);
    }
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
    setCancelConfirmationOpen(false);
    setCompletedAt(null);
    setCopyFeedback(null);
    setFullCardWinnerPlayerId(null);
    setLineWinnerPlayerId(null);
    setPlayers([]);
    setResult(null);
    setStartedAt(null);
    setPlaylistText("");
    setActiveTab("setup");
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(successMessage);
    } catch {
      setCopyFeedback("No se pudo copiar automáticamente. Mantén pulsado el texto para seleccionarlo.");
    }
  }

  async function copyJoinCode() {
    if (createdGame) await copyText(createdGame.joinCode, "Código de partida copiado.");
  }

  async function copyGameSummary() {
    if (!createdGame) return;
    await copyText(buildGameSummary({
      bingoWinner: winnerName(fullCardWinnerPlayerId),
      calledSongs: calledSongs.map(({ song }) => song),
      completedAt,
      joinCode: createdGame.joinCode,
      lineWinner: winnerName(lineWinnerPlayerId),
      startedAt,
    }), "Resumen de resultados copiado.");
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
          <p className="field-label"><Icon name="clipboard" /> IMPORTAR CANCIONES</p>
          <p>Usa una canción por línea: <code>Título;Artista</code> o <code>Título - Artista</code>. También puedes pegar CSV.</p>
          <p><strong>Mínimo: 24 canciones.</strong> Recomendamos entre 30 y 45 canciones para que los cartones sean más variados, especialmente con grupos grandes.</p>
          <section className="import-result">
            <p className="field-label"><Icon name="spotify" /> IMPORTAR DESDE SPOTIFY</p>
            <p>{spotifyConnected ? "Spotify está conectado. Pega una URL o URI de playlist." : "Conecta la cuenta Spotify propietaria o colaboradora de la playlist."}</p>
            {spotifyConnected ? <>
              <label className="field-label" htmlFor="spotify-playlist" style={{ marginTop: 18 }}>ENLACE DE PLAYLIST DE SPOTIFY</label>
              <input className="field" id="spotify-playlist" onChange={(event) => setSpotifyPlaylist(event.target.value)} placeholder="https://open.spotify.com/playlist/..." value={spotifyPlaylist} />
              <button className="button" disabled={pending || !spotifyPlaylist.trim()} onClick={importSpotifyPlaylist} type="button"><Icon name="music" /> {pending ? "Cargando…" : "Cargar canciones"}</button>
              <button className="button" disabled={pending} onClick={() => { void fetch("/api/admin/spotify/disconnect", { method: "POST" }).then(() => setSpotifyConnected(false)); }} type="button"><Icon name="x-circle" /> Desconectar Spotify</button>
            </> : <a className="button" href="/api/admin/spotify/connect"><Icon name="spotify" /> Conectar Spotify</a>}
            <SpotifyImportFeedback message={spotifyError} />
          </section>
          <form onSubmit={onSubmit}>
            <label className="field-label" htmlFor="playlist" style={{ marginTop: 18 }}><Icon name="clipboard" /> LISTA DE CANCIONES</label>
            <textarea className="field playlist-input" id="playlist" name="playlist" required rows={8} value={playlistText} onChange={(event) => setPlaylistText(event.target.value)} placeholder={"La Flaca;Jarabe de Palo\nDancing Queen;ABBA"} />
            <button className="button" type="submit" disabled={pending}><Icon name="eye" /> {pending ? "Analizando…" : "Previsualizar lista"}</button>
          </form>
          {result ? <div className="import-result">
            <p><strong>{result.songs.length}</strong> canciones válidas</p>
            {result.songs.length > 0 ? <ul>{result.songs.map((song) => <li key={`${song.title}-${song.artist}`}><strong>{song.title}</strong><span>{song.artist}</span></li>)}</ul> : null}
            {result.errors.length > 0 ? <p role="alert">{result.errors.length} filas necesitan revisión.</p> : null}
            {result.errors.length === 0 && result.songs.length >= 24 ? <button className="button" type="button" disabled={pending} onClick={createGame}><Icon name="play" /> {pending ? "Creando…" : "Crear partida"}</button> : <p role="alert">Añade {Math.max(0, 24 - result.songs.length)} canción{result.songs.length === 23 ? "" : "es"} válida{result.songs.length === 23 ? "" : "s"} más para crear la partida.</p>}
          </div> : null}
        </>,
        room: createdGame ? <div className="import-result">
          <GameLifecycle status={createdGame.status} />
          <section className="room-share-card">
            <p className="field-label"><Icon name="ticket" /> CÓDIGO DE LA PARTIDA</p>
            <p className="join-code">{createdGame.joinCode}</p>
            <p>Comparte el código o escanea el QR para entrar en la sala.</p>
            <div className="room-share-actions"><a className="button" href={playerUrl ?? `/play/${createdGame.joinCode}`}><Icon name="external-link" /> Abrir enlace de jugadores</a><button className="button button-secondary" disabled={pending} onClick={() => { void copyJoinCode(); }} type="button"><Icon name="copy" /> Copiar código</button></div>
            {playerUrl ? <QrCode url={playerUrl} /> : null}
          </section>
          <p>{createdGame.status === "waiting" ? "Inscripciones abiertas." : createdGame.status === "playing" ? "Partida en curso: inscripciones cerradas." : "Partida finalizada. Consulta los resultados."}</p>
          <PlayerLobby players={players} />
          {createdGame.status === "waiting" && missingPlayersToStart > 0 ? <p role="alert">Falta{missingPlayersToStart === 1 ? "" : "n"} {missingPlayersToStart} jugador{missingPlayersToStart === 1 ? "" : "es"} para iniciar la partida. El mínimo es 2.</p> : null}
          {roomAction ? <p className="room-action-feedback" role="status">{roomAction === "starting" ? "Iniciando partida…" : roomAction === "finishing" ? "Finalizando partida…" : "Cancelando partida…"}</p> : null}
          {createdGame.status === "waiting" ? <button className="button" disabled={pending || missingPlayersToStart > 0} onClick={startGame} type="button"><Icon name="play" /> {roomAction === "starting" ? "Iniciando…" : "Iniciar partida y cerrar inscripciones"}</button> : null}
          {createdGame.status !== "completed" ? <button className="button" disabled={pending} onClick={finishGame} type="button"><Icon name="flag" /> {roomAction === "finishing" ? "Finalizando…" : "Finalizar partida y ver resultados"}</button> : null}
          {createdGame.status !== "completed" && !cancelConfirmationOpen ? <button className="button button-danger" disabled={pending} onClick={() => setCancelConfirmationOpen(true)} type="button"><Icon name="x-circle" /> Cancelar partida</button> : null}
          {createdGame.status !== "completed" && cancelConfirmationOpen ? <CancelGameConfirmation onCancel={() => setCancelConfirmationOpen(false)} onConfirm={() => { void cancelGame(); }} pending={pending} /> : null}
          {copyFeedback ? <p className="copy-feedback" role="status">{copyFeedback}</p> : null}
        </div> : <p>Crea una partida en Preparar para abrir la sala.</p>,
        calls: createdGame?.status === "playing" || createdGame?.status === "completed" ? <div className="import-result">
          {lastCalledSong ? <section className="import-result"><p className="field-label"><Icon name="volume" /> ÚLTIMA CANCIÓN ANUNCIADA</p><p><strong>{lastCalledSong.title}</strong> — {lastCalledSong.artist}</p></section> : <p>Aún no se ha anunciado ninguna canción.</p>}
          {calledSongs.length > 0 ? <section className="import-result"><p className="field-label"><Icon name="history" /> HISTORIAL DE CANCIONES</p><ol>{calledSongs.map(({ song, songId }) => <li key={`called-${songId}`}><strong>{song.title}</strong> — {song.artist}</li>)}</ol></section> : null}
          {createdGame.status === "playing" ? <><p className="field-label" style={{ marginTop: 18 }}><Icon name="music" /> CANCIONES PENDIENTES</p>{pendingSongs.map(({ song, songId }) => <button className="button" disabled={pending} key={songId} onClick={() => callSong(songId)} type="button"><Icon name="music" /> {song.title} — {song.artist}</button>)}</> : null}
        </div> : <p>Inicia la partida para empezar a anunciar canciones.</p>,
        results: createdGame?.status === "completed" ? <section className="import-result"><ResultCelebration fullCardWinner={winnerName(fullCardWinnerPlayerId)} lineWinner={winnerName(lineWinnerPlayerId)} /><p>Inicio: <strong>{formatGameTimestamp(startedAt)}</strong></p><p>Fin: <strong>{formatGameTimestamp(completedAt)}</strong></p><p>{calledSongs.length} canciones anunciadas en total.</p>{calledSongs.length > 0 ? <ol className="result-song-list">{calledSongs.map(({ song, songId }) => <li key={`result-${songId}`}><strong>{song.title}</strong> — {song.artist}</li>)}</ol> : null}<button className="button button-secondary" onClick={() => { void copyGameSummary(); }} type="button"><Icon name="copy" /> Copiar resumen</button>{copyFeedback ? <p className="copy-feedback" role="status">{copyFeedback}</p> : null}</section> : <p>Los resultados estarán disponibles al finalizar la partida.</p>,
      }}
    </AdminTabs>
  </section>;
}
