"use client";

import { FormEvent, useEffect, useState } from "react";

import { playerGameUrl } from "../server/games/player-game-url";
import { AdminGameStatus, AdminTabId, AdminTabs } from "./admin-tabs";
import { GameLifecycle, PlayerLobby, ResultCelebration } from "./host-game-status";
import { Icon } from "./icons";
import GameHistory from "./game-history";
import QrCode from "./qr-code";

type Song = { title: string; artist: string; spotifyUri?: string };
type ImportResult = { songs: Song[]; errors: { line: number; message: string }[] };
type AdminPlayer = { id: string; name: string };
type RoomAction = "starting" | "finishing" | "cancelling" | null;
type PlaybackAction = "announce" | "replay";

export function shouldShowNewGameButton(status: AdminGameStatus | null, tab: AdminTabId): boolean {
  return status === "completed" && tab === "setup";
}

export function getTabAfterStartingGame(): AdminTabId {
  return "calls";
}

export function getCreateGameReadiness(songCount: number, errorCount: number): { canCreate: boolean; message: string | null } {
  if (errorCount > 0) {
    return { canCreate: false, message: "Revisa las filas con errores antes de crear la partida." };
  }

  const missingSongs = Math.max(0, 24 - songCount);
  return missingSongs === 0
    ? { canCreate: true, message: null }
    : missingSongs === 1
      ? { canCreate: false, message: "Falta 1 canción válida para crear la partida. Añádela a la lista y vuelve a previsualizarla." }
      : { canCreate: false, message: `Faltan ${missingSongs} canciones válidas para crear la partida. Añádelas a la lista y vuelve a previsualizarla.` };
}

export function pickRandomSongId(songIds: string[], randomValue = Math.random()): string | null {
  if (songIds.length === 0) return null;
  const safeRandomValue = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 1) : 0;
  return songIds[Math.min(songIds.length - 1, Math.floor(safeRandomValue * songIds.length))] ?? null;
}

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function songMatchesSearch(song: Song, query: string): boolean {
  const normalizedQuery = normalizeSearch(query.trim());
  return normalizedQuery.length === 0 || normalizeSearch(`${song.title} ${song.artist}`).includes(normalizedQuery);
}

export function isSpotifyPlaybackError(message: string): boolean {
  return /spotify|dispositivo/i.test(message);
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

export function PlaybackErrorModal({ message, onClose, onRetry, operation }: { message: string; onClose: () => void; onRetry: () => void; operation: PlaybackAction }) {
  const spotifyError = isSpotifyPlaybackError(message);
  const replaying = operation === "replay";

  return <div aria-describedby="playback-error-description" aria-labelledby="playback-error-title" aria-modal="true" className="modal-backdrop" role="alertdialog">
    <section className="modal-card playback-error-modal">
      <p className="field-label">{spotifyError ? <><Icon name="spotify" /> PROBLEMA CON SPOTIFY</> : <><Icon name="alert-circle" /> PROBLEMA AL ANUNCIAR</>}</p>
      <h2 id="playback-error-title"><Icon name="alert-circle" /> {spotifyError ? replaying ? "No se pudo repetir" : "No se pudo reproducir" : "No se pudo anunciar"}</h2>
      <p id="playback-error-description">{message}</p>
      <p className="playback-error-note">{replaying ? "La canción sigue anunciada en la partida; solo ha fallado la reproducción adicional." : "La canción todavía no se ha anunciado en la partida."}</p>
      <div className="playback-error-actions">
        <button autoFocus className="button" onClick={onRetry} type="button"><Icon name="play" /> Reintentar</button>
        {spotifyError ? <a className="button button-secondary" href="/api/admin/spotify/connect?returnTo=calls"><Icon name="spotify" /> Reconectar Spotify</a> : null}
        <button className="button button-secondary" onClick={onClose} type="button">Cerrar</button>
      </div>
    </section>
  </div>;
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
  const spotifyUri = typeof value === "object" && value !== null ? (value as Song).spotifyUri : undefined;
  return typeof value === "object" && value !== null
    && typeof (value as Song).title === "string"
    && typeof (value as Song).artist === "string"
    && (spotifyUri === undefined || (typeof spotifyUri === "string" && /^spotify:track:[A-Za-z0-9_-]+$/.test(spotifyUri)));
}

function formatSongs(songs: Song[]): string {
  return songs.map((song) => `${song.title};${song.artist}`).join("\n");
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
  const [previewedPlaylistText, setPreviewedPlaylistText] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyPlaylist, setSpotifyPlaylist] = useState("");
  const [roomAction, setRoomAction] = useState<RoomAction>(null);
  const [songSearch, setSongSearch] = useState("");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [failedSongId, setFailedSongId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [playbackAction, setPlaybackAction] = useState<PlaybackAction>("announce");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoreCallsTab = params.get("tab") === "calls";
    const restoreTimer = restoreCallsTab ? window.setTimeout(() => setActiveTab("calls"), 0) : null;
    if (params.has("spotify")) window.history.replaceState({}, "", window.location.pathname);
    return () => {
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (!historyModalOpen && !playbackModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryModalOpen(false);
        setPlaybackModalOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [historyModalOpen, playbackModalOpen]);


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
    setPreviewedPlaylistText(typeof text === "string" ? text : "");
  }

  async function createGame() {
    setPending(true);
    setError(null);
    const body: { songs?: Song[]; text: string } = { text: playlistText };
    if (result && previewedPlaylistText === playlistText) {
      body.songs = result.songs;
    }
    const response = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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
      const importedText = formatSongs(songs);
      setPlaylistText(importedText);
      setPreviewedPlaylistText(importedText);
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
      setActiveTab(getTabAfterStartingGame());
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
    setPlaybackError(null);
    setPlaybackModalOpen(false);
    setFailedSongId(null);
    setPlaybackAction("announce");
    try {
      const response = await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: createdGame.joinCode, songId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        setPlaybackError(typeof body?.error === "string" ? body.error : "No se pudo anunciar la canción.");
        setFailedSongId(songId);
        setPlaybackModalOpen(true);
        return;
      }

      setCalledSongIds((current) => [...current, songId]);
      setPlaybackError(null);
    } catch {
      setPlaybackError("No se pudo contactar con la sala. Inténtalo de nuevo.");
      setFailedSongId(songId);
      setPlaybackModalOpen(true);
    } finally {
      setPending(false);
    }
  }

  async function replaySong(songId: string) {
    if (!createdGame) return;

    setPending(true);
    setPlaybackAction("replay");
    setPlaybackError(null);
    setPlaybackModalOpen(false);
    setFailedSongId(null);
    try {
      const response = await fetch("/api/admin/spotify/replay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: createdGame.joinCode, songId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        setPlaybackError(typeof body?.error === "string" ? body.error : "No se pudo repetir la reproducción.");
        setFailedSongId(songId);
        setPlaybackModalOpen(true);
        return;
      }
      setPlaybackError(null);
    } catch {
      setPlaybackError("No se pudo contactar con Spotify. Inténtalo de nuevo.");
      setFailedSongId(songId);
      setPlaybackModalOpen(true);
    } finally {
      setPending(false);
    }
  }

  function closePlaybackError() {
    setPlaybackModalOpen(false);
  }

  function retryFailedSong() {
    if (!failedSongId) return;
    if (playbackAction === "replay") {
      void replaySong(failedSongId);
    } else {
      void callSong(failedSongId);
    }
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
    setSongSearch("");
    setHistoryModalOpen(false);
    setHistorySearch("");
    setFailedSongId(null);
    setPlaybackError(null);
    setPlaybackModalOpen(false);
    setPlaybackAction("announce");
    setStartedAt(null);
    setPlaylistText("");
    setPreviewedPlaylistText("");
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
  const filteredCalledSongs = calledSongs.filter(({ song }) => songMatchesSearch(song, historySearch));
  const filteredPendingSongs = pendingSongs.filter(({ song }) => songMatchesSearch(song, songSearch));
  const lastCalled = calledSongs.at(-1);
  const lastCalledSong = lastCalled?.song;
  const lastCalledSongId = lastCalled?.songId;
  const missingPlayersToStart = Math.max(0, 2 - players.length);

  function callRandomSong() {
    const randomSongId = pickRandomSongId(pendingSongs.map(({ songId }) => songId));
    if (randomSongId) void callSong(randomSongId);
  }

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
            {(() => {
              const readiness = getCreateGameReadiness(result.songs.length, result.errors.length);
              return <>
                <button aria-describedby={readiness.message ? "create-game-readiness" : undefined} className="button" type="button" disabled={pending || !readiness.canCreate} onClick={createGame}><Icon name="play" /> {pending ? "Creando…" : "Crear partida"}</button>
                {readiness.message ? <p className="create-game-readiness" id="create-game-readiness" role="alert">{readiness.message}</p> : null}
              </>;
            })()}
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
          {createdGame.status === "playing" ? <p className="calls-guidance" role="status">Partida iniciada. Elige una canción pendiente para anunciarla a los jugadores{playlistSongs.some(({ song }) => song.spotifyUri) ? " y cambiarla en Spotify" : ""}.</p> : null}
          {lastCalledSong ? <section className="import-result"><p className="field-label"><Icon name="volume" /> ÚLTIMA CANCIÓN ANUNCIADA</p><p><strong>{lastCalledSong.title}</strong> — {lastCalledSong.artist}</p>{lastCalledSong.spotifyUri && lastCalledSongId ? <button className="button button-secondary replay-button" disabled={pending} onClick={() => void replaySong(lastCalledSongId)} type="button"><Icon name="play" /> Reproducir de nuevo</button> : null}</section> : <p>Aún no se ha anunciado ninguna canción.</p>}
          {playbackError && !playbackModalOpen ? <p className="playback-error-status" role="status"><strong>{isSpotifyPlaybackError(playbackError) ? playbackAction === "replay" ? "No se pudo repetir en Spotify." : "Spotify no disponible." : "No se pudo anunciar."}</strong> {playbackAction === "replay" ? "La canción sigue anunciada; solo ha fallado la reproducción adicional." : "La canción todavía no se ha anunciado."} <button onClick={() => setPlaybackModalOpen(true)} type="button">Ver detalles</button></p> : null}
          {calledSongs.length > 0 ? <>
            <button aria-haspopup="dialog" className="calls-history-trigger" onClick={() => setHistoryModalOpen(true)} type="button"><Icon name="history" /> Historial de canciones ({calledSongs.length})</button>
            {historyModalOpen ? <div aria-labelledby="calls-history-title" className="modal-backdrop calls-history-backdrop" role="dialog" aria-modal="true">
              <section className="modal-card calls-history-modal">
                <div className="calls-history-header">
                  <div>
                    <p className="field-label">HISTORIAL DE CANCIONES</p>
                    <h2 id="calls-history-title">Canciones anunciadas</h2>
                  </div>
                  <button aria-label="Cerrar historial" autoFocus className="button button-secondary calls-history-close" onClick={() => setHistoryModalOpen(false)} type="button"><Icon name="x-circle" /></button>
                </div>
                <label className="field-label calls-search-label" htmlFor="history-search">BUSCAR EN EL HISTORIAL</label>
                <input className="field calls-search" id="history-search" onChange={(event) => setHistorySearch(event.target.value)} placeholder="Título o artista" type="search" value={historySearch} />
                <p className="calls-modal-count" role="status">{filteredCalledSongs.length} visibles de {calledSongs.length}</p>
                <div className="calls-history-scroll-region">
                  <ol className="calls-history-modal-list">
                    {filteredCalledSongs.length > 0 ? filteredCalledSongs.map(({ song, songId }) => <li key={`called-${songId}`}><span className="replay-song-title"><strong>{song.title}</strong> — {song.artist}</span>{song.spotifyUri ? <button className="button button-secondary replay-button" disabled={pending} onClick={() => void replaySong(songId)} type="button"><Icon name="play" /> Reproducir de nuevo</button> : null}</li>) : <li className="calls-empty">No hay canciones anunciadas que coincidan con la búsqueda.</li>}
                  </ol>
                  {filteredCalledSongs.length > 8 ? <p className="scroll-hint">Desliza dentro de la lista para ver más canciones ↓</p> : null}
                </div>
                <button className="button button-secondary calls-history-dismiss" onClick={() => setHistoryModalOpen(false)} type="button">Cerrar historial</button>
              </section>
            </div> : null}
          </> : null}
          {createdGame.status === "playing" ? <section aria-labelledby="pending-songs-title" className="calls-pending-section">
            <div className="calls-controls">
              <div className="calls-counts" aria-label="Estado de canciones">
                <p><strong>{calledSongs.length}</strong><span>Anunciadas</span></p>
                <p><strong>{pendingSongs.length}</strong><span>Pendientes</span></p>
              </div>
              <div className="calls-controls-actions">
                <button className="button button-secondary calls-random-button" disabled={pending || pendingSongs.length === 0} onClick={callRandomSong} type="button"><Icon name="shuffle" /> Anunciar canción aleatoria</button>
                {playlistSongs.some(({ song }) => song.spotifyUri) ? <a className="button button-secondary calls-reconnect-button" href="/api/admin/spotify/connect?returnTo=calls"><Icon name="spotify" /> {spotifyConnected ? "Reconectar Spotify" : "Conectar Spotify"}</a> : null}
              </div>
            </div>
            <div className="calls-section-heading">
              <p className="field-label" id="pending-songs-title"><Icon name="music" /> CANCIONES PENDIENTES</p>
              <span>{filteredPendingSongs.length} visibles</span>
            </div>
            <label className="field-label calls-search-label" htmlFor="song-search">BUSCAR CANCIÓN</label>
            <input className="field calls-search" id="song-search" onChange={(event) => setSongSearch(event.target.value)} placeholder="Título o artista" type="search" value={songSearch} />
            <div className="calls-pending-scroll-region">
              <div className="calls-pending-list">
                {filteredPendingSongs.length > 0 ? filteredPendingSongs.map(({ song, songId }) => <button className="button" disabled={pending} key={songId} onClick={() => callSong(songId)} type="button"><Icon name="music" /> {song.spotifyUri ? "Reproducir y anunciar" : "Anunciar"}: {song.title} — {song.artist}</button>) : <p className="calls-empty" role="status">No hay canciones pendientes que coincidan con la búsqueda.</p>}
              </div>
              {filteredPendingSongs.length > 8 ? <p className="scroll-hint">Desliza dentro de la lista para ver más canciones ↓</p> : null}
            </div>
          </section> : null}
          {playbackModalOpen && playbackError ? <PlaybackErrorModal message={playbackError} onClose={closePlaybackError} onRetry={retryFailedSong} operation={playbackAction} /> : null}
        </div> : <p>Inicia la partida para empezar a anunciar canciones.</p>,
        results: createdGame?.status === "completed" ? <section className="import-result"><ResultCelebration fullCardWinner={winnerName(fullCardWinnerPlayerId)} lineWinner={winnerName(lineWinnerPlayerId)} /><p>Inicio: <strong>{formatGameTimestamp(startedAt)}</strong></p><p>Fin: <strong>{formatGameTimestamp(completedAt)}</strong></p><p>{calledSongs.length} canciones anunciadas en total.</p>{calledSongs.length > 0 ? <ol className="result-song-list">{calledSongs.map(({ song, songId }) => <li key={`result-${songId}`}><strong>{song.title}</strong> — {song.artist}</li>)}</ol> : null}<button className="button button-secondary" onClick={() => { void copyGameSummary(); }} type="button"><Icon name="copy" /> Copiar resumen</button>{copyFeedback ? <p className="copy-feedback" role="status">{copyFeedback}</p> : null}</section> : <p>Los resultados estarán disponibles al finalizar la partida.</p>,
        history: <GameHistory />,
      }}
    </AdminTabs>
  </section>;
}
