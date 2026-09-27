"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminGameHistoryItem } from "../server/convex/admin-command";
import { Icon } from "./icons";

type HistoryFilter = "all" | "cancelled" | "completed";
type Song = { artist: string; id: string; title: string };
type GameDetail = AdminGameHistoryItem & {
  calledSongIds: string[];
  fullCardWinnerPlayerId: string | null;
  lineWinnerPlayerId: string | null;
  playlist: Song[];
  players: { id: string; name: string }[];
};

function formatTimestamp(timestamp: number | null): string {
  return timestamp === null ? "Sin registrar" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function matchesSearch(game: AdminGameHistoryItem, query: string): boolean {
  return game.joinCode.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"));
}

function statusLabel(status: AdminGameHistoryItem["status"]): string {
  return status === "completed" ? "Completada" : "Cancelada";
}

export default function GameHistory() {
  const [games, setGames] = useState<AdminGameHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/games?history=true", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el historial de partidas.");
        return await response.json() as { games?: unknown };
      })
      .then((body) => {
        if (!active) return;
        const history = Array.isArray(body.games) ? body.games : [];
        setGames(history as AdminGameHistoryItem[]);
        setError(null);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar el historial de partidas. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedCode) return;
    let active = true;
    void fetch(`/api/admin/games?joinCode=${encodeURIComponent(selectedCode)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el detalle de la partida.");
        return await response.json() as Partial<GameDetail>;
      })
      .then((game) => {
        if (!active || typeof game.joinCode !== "string") return;
        setDetail({
          calledSongCount: Array.isArray(game.calledSongIds) ? game.calledSongIds.length : 0,
          calledSongIds: Array.isArray(game.calledSongIds) ? game.calledSongIds.filter((id): id is string => typeof id === "string") : [],
          completedAt: typeof game.completedAt === "number" ? game.completedAt : null,
          endedAt: typeof game.endedAt === "number" ? game.endedAt : typeof game.completedAt === "number" ? game.completedAt : null,
          fullCardWinnerName: null,
          fullCardWinnerPlayerId: typeof game.fullCardWinnerPlayerId === "string" ? game.fullCardWinnerPlayerId : null,
          joinCode: game.joinCode,
          lineWinnerName: null,
          lineWinnerPlayerId: typeof game.lineWinnerPlayerId === "string" ? game.lineWinnerPlayerId : null,
          playerCount: Array.isArray(game.players) ? game.players.length : 0,
          players: Array.isArray(game.players) ? game.players.filter((player): player is { id: string; name: string } => typeof player === "object" && player !== null && typeof player.id === "string" && typeof player.name === "string") : [],
          playlist: Array.isArray(game.playlist) ? game.playlist.filter((song): song is Song => typeof song === "object" && song !== null && typeof song.id === "string" && typeof song.title === "string" && typeof song.artist === "string") : [],
          startedAt: typeof game.startedAt === "number" ? game.startedAt : null,
          status: game.status === "cancelled" ? "cancelled" : "completed",
        });
      })
      .catch(() => {
        if (active) setError("No se pudo cargar el detalle de la partida. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [selectedCode]);

  useEffect(() => {
    if (!selectedCode) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCode(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedCode]);

  const filteredGames = useMemo(() => games.filter((game) =>
    (filter === "all" || game.status === filter) && matchesSearch(game, search)), [filter, games, search]);

  const detailCalledSongs = detail?.playlist.filter((song) => detail.calledSongIds.includes(song.id)) ?? [];
  const winnerName = (playerId: string | null) => detail?.players.find((player) => player.id === playerId)?.name ?? "Sin ganador";

  function closeDetail() {
    setSelectedCode(null);
    setDetail(null);
    setDeleteConfirmationOpen(false);
    setDeleteConfirmCode("");
  }

  async function deleteSelectedGame() {
    if (!selectedCode || deleteConfirmCode.trim() !== selectedCode) return;
    setDeletePending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/games/history", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinCode: selectedCode }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        throw new Error(typeof body?.error === "string" ? body.error : "No se pudo borrar la partida.");
      }
      setGames((current) => current.filter((game) => game.joinCode !== selectedCode));
      closeDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo borrar la partida.");
    } finally {
      setDeletePending(false);
    }
  }

  return <section className="game-history" aria-labelledby="game-history-title">
    <div className="game-history-heading">
      <div>
        <p className="field-label"><Icon name="history" /> HISTORIAL DE PARTIDAS</p>
        <h2 id="game-history-title">Partidas anteriores</h2>
      </div>
      <span className="game-history-count" aria-live="polite">{filteredGames.length} visibles</span>
    </div>
    <p>Consulta los resultados y las canciones anunciadas de rondas anteriores.</p>
    <div className="game-history-controls">
      <label className="field-label" htmlFor="game-history-search">BUSCAR POR CÓDIGO</label>
      <input className="field" id="game-history-search" onChange={(event) => setSearch(event.target.value)} placeholder="Código de partida" type="search" value={search} />
      <label className="field-label" htmlFor="game-history-filter">FILTRAR POR ESTADO</label>
      <select className="field" id="game-history-filter" onChange={(event) => setFilter(event.target.value as HistoryFilter)} value={filter}>
        <option value="all">Todas</option>
        <option value="completed">Completadas</option>
        <option value="cancelled">Canceladas</option>
      </select>
    </div>
    {error ? <p className="game-history-error" role="alert">{error}</p> : null}
    {loading ? <p role="status">Cargando historial…</p> : filteredGames.length === 0 ? <div className="game-history-empty"><Icon name="history" /><p>{games.length === 0 ? "Todavía no hay partidas anteriores." : "No hay partidas que coincidan con el filtro."}</p></div> : <div className="game-history-list">
      {filteredGames.map((game) => <article className="game-history-card" key={game.joinCode}>
        <div className="game-history-card-header"><div><span className={`game-history-status game-history-status-${game.status}`}>{statusLabel(game.status)}</span><h3>{game.joinCode}</h3></div><time dateTime={game.endedAt ? new Date(game.endedAt).toISOString() : undefined}>{formatTimestamp(game.endedAt)}</time></div>
        <div className="game-history-facts"><span><Icon name="users" /> {game.playerCount} jugadores</span><span><Icon name="music" /> {game.calledSongCount} canciones</span></div>
        {game.status === "completed" ? <p className="game-history-winners"><strong>Bingo:</strong> {game.fullCardWinnerName ?? "Sin ganador"} · <strong>Línea:</strong> {game.lineWinnerName ?? "Sin ganador"}</p> : <p className="game-history-winners">Partida cancelada antes de finalizar.</p>}
        <button className="button button-secondary" onClick={() => { setDetail(null); setDeleteConfirmationOpen(false); setDeleteConfirmCode(""); setDetailLoading(true); setSelectedCode(game.joinCode); }} type="button"><Icon name="eye" /> Ver detalles</button>
      </article>)}
    </div>}
    {selectedCode ? <div aria-labelledby="game-history-detail-title" className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card game-history-detail">
        <div className="game-history-heading"><div><p className="field-label">DETALLE DE LA PARTIDA</p><h2 id="game-history-detail-title">{selectedCode}</h2></div><button aria-label="Cerrar detalle de partida" autoFocus className="button button-secondary" onClick={closeDetail} type="button"><Icon name="x-circle" /></button></div>
        {detailLoading ? <p role="status">Cargando detalle…</p> : detail ? <>
          <p><span className={`game-history-status game-history-status-${detail.status}`}>{statusLabel(detail.status)}</span></p>
          <dl className="game-history-detail-facts"><div><dt>Inicio</dt><dd>{formatTimestamp(detail.startedAt)}</dd></div><div><dt>Fin</dt><dd>{formatTimestamp(detail.endedAt)}</dd></div><div><dt>Jugadores</dt><dd>{detail.playerCount}</dd></div><div><dt>Canciones anunciadas</dt><dd>{detail.calledSongCount}</dd></div></dl>
          {detail.status === "completed" ? <div className="game-history-winner-detail"><p><strong>Bingo:</strong> {winnerName(detail.fullCardWinnerPlayerId)}</p><p><strong>Línea:</strong> {winnerName(detail.lineWinnerPlayerId)}</p></div> : null}
          <h3>Jugadores</h3>
          <ul className="game-history-player-list">{detail.players.length > 0 ? detail.players.map((player) => <li key={player.id}>{player.name}</li>) : <li>No hay jugadores registrados.</li>}</ul>
          <h3>Canciones anunciadas</h3>
          <div className="game-history-song-list">{detailCalledSongs.length > 0 ? detailCalledSongs.map((song) => <p key={song.id}><strong>{song.title}</strong> — {song.artist}</p>) : <p>No se anunciaron canciones.</p>}</div>
          {!deleteConfirmationOpen ? <button className="button button-danger game-history-delete-button" onClick={() => setDeleteConfirmationOpen(true)} type="button"><Icon name="ban" /> Borrar partida permanentemente</button> : <section aria-labelledby="delete-game-title" className="game-history-delete-confirmation" role="alertdialog">
            <p className="field-label" id="delete-game-title">BORRADO PERMANENTE</p>
            <p>Se eliminarán la partida, sus jugadores, la playlist y sus resultados. Esta acción no se puede deshacer.</p>
            <label className="field-label" htmlFor="delete-game-code">ESCRIBE {selectedCode} PARA CONFIRMAR</label>
            <input autoFocus className="field" id="delete-game-code" onChange={(event) => setDeleteConfirmCode(event.target.value)} placeholder={selectedCode} value={deleteConfirmCode} />
            <button className="button button-danger" disabled={deletePending || deleteConfirmCode.trim() !== selectedCode} onClick={() => { void deleteSelectedGame(); }} type="button">{deletePending ? "Borrando…" : "Confirmar borrado permanente"}</button>
            <button className="button button-secondary" disabled={deletePending} onClick={() => { setDeleteConfirmationOpen(false); setDeleteConfirmCode(""); }} type="button">No borrar</button>
          </section>}
        </> : <p role="alert">No se pudo cargar el detalle de esta partida.</p>}
        <button className="button button-secondary" disabled={deletePending} onClick={closeDetail} type="button">Cerrar detalle</button>
      </section>
    </div> : null}
  </section>;
}
