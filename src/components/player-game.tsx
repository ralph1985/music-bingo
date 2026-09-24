"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState, useSyncExternalStore } from "react";

import { api } from "../../convex/_generated/api";
import { loadLocalGame, saveLocalGame } from "../storage/local-storage";

type PlayerGameProps = {
  joinCode: string;
};

function FeedbackModal({ message, onClose }: { message: string; onClose: () => void }) {
  const won = message.startsWith("¡");

  return <div aria-labelledby="feedback-title" className="modal-backdrop" role="dialog" aria-modal="true">
    <section className="modal-card">
      <p className="field-label">RESULTADO DE LA JUGADA</p>
      <h2 id="feedback-title">{won ? "¡Enhorabuena!" : "Revisa tu cartón"}</h2>
      <p>{message}</p>
      <button autoFocus className="button" onClick={onClose} type="button">Continuar jugando</button>
    </section>
  </div>;
}

let cachedStoredGame: ReturnType<typeof loadLocalGame> | undefined;

function hasMarkedVerticalLine(markedSongIds: string[], cardSongIds: string[]): boolean {
  return Array.from({ length: 3 }, (_, column) =>
    Array.from({ length: 4 }, (_, row) => cardSongIds[row * 3 + column])
      .every((songId) => markedSongIds.includes(songId)),
  ).some(Boolean);
}

function subscribeToLocalGame(): () => void {
  return () => {};
}

function getStoredGame() {
  if (cachedStoredGame === undefined) {
    cachedStoredGame = loadLocalGame(window.localStorage);
  }

  return cachedStoredGame;
}

export default function PlayerGame({ joinCode }: PlayerGameProps) {
  const joinPlayer = useMutation(api.games.joinPlayer);
  const claimFullCard = useMutation(api.games.claimFullCard);
  const claimLine = useMutation(api.games.claimLine);
  const markCell = useMutation(api.games.markCell);
  const savedGame = useSyncExternalStore(
    subscribeToLocalGame,
    getStoredGame,
    () => null,
  );
  const recoveredGame = savedGame?.gameId === joinCode ? savedGame : null;
  const [enteredName, setEnteredName] = useState("");
  const name = recoveredGame?.player.name ?? enteredName;
  const [joinedIdentity, setJoinedIdentity] = useState<string | null>(null);
  const playerIdentity = joinedIdentity ?? recoveredGame?.player.id ?? null;
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const game = useQuery(
    api.games.getPlayerGame,
    playerIdentity ? { joinCode, playerIdentity } : "skip",
  );


  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Escribe tu nombre para entrar.");
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const identity = playerIdentity ?? crypto.randomUUID();
      const joinedPlayer = await joinPlayer({
        joinCode,
        name: normalizedName,
        playerIdentity: identity,
      });

      saveLocalGame(window.localStorage, {
        card: joinedPlayer.card,
        gameId: joinCode,
        markedSongIds: [],
        player: { id: identity, name: normalizedName },
      });
      setJoinedIdentity(identity);
    } catch {
      setError("No se pudo entrar en esta partida.");
    } finally {
      setJoining(false);
    }
  }

  async function onMark(songId: string) {
    if (!playerIdentity) {
      return;
    }

    try {
      await markCell({ joinCode, playerIdentity, songId });
    } catch {
      setError("No se pudo marcar esta canción.");
    }
  }

  async function onClaimLine() {
    if (!playerIdentity) {
      return;
    }

    try {
      const result = await claimLine({ joinCode, playerIdentity });
      setError(result?.outcome === "won" ? "¡Línea válida!" : "Línea inválida: revisa las canciones que ya han sonado.");
    } catch {
      setError("No se pudo comprobar la línea.");
    }
  }

  async function onClaimFullCard() {
    if (!playerIdentity) {
      return;
    }

    try {
      const result = await claimFullCard({ joinCode, playerIdentity });
      setError(result?.outcome === "won" ? "¡Bingo válido!" : "Bingo inválido: revisa las canciones que ya han sonado.");
    } catch {
      setError("No se pudo comprobar el cartón.");
    }
  }

  if (playerIdentity && game === undefined) {
    return <section className="panel"><p>Recuperando tu cartón…</p></section>;
  }

  if (playerIdentity && game) {
    const cardSongIds = game.player.card.songs.map((song) => song.id);
    const canClaimLine = hasMarkedVerticalLine(game.player.markedSongIds, cardSongIds);
    const canClaimFullCard = cardSongIds.every((songId) => game.player.markedSongIds.includes(songId));
    const gameFinished = game.game.status === "completed" || game.game.status === "cancelled";
    const statusLabel = game.game.status === "waiting" ? "EN ESPERA" : game.game.status === "playing" ? "EN CURSO" : game.game.status === "completed" ? "FINALIZADA" : "CANCELADA";

    return <>
      <section className="panel">
        <p className="field-label">PARTIDA {statusLabel}</p>
        <p>{gameFinished ? "La partida ha terminado. Gracias por jugar." : `${game.game.calledSongCount} canciones anunciadas. La línea se completa en vertical: 4 canciones de una columna. Puedes marcar y corregir tu cartón; se validará al reclamar.`}</p>
      </section>
      <section className="card-grid" aria-label="Tu cartón musical">
        {game.player.card.songs.map((song) => <button aria-pressed={game.player.markedSongIds.includes(song.id)} className="song-cell" disabled={gameFinished} key={song.id} onClick={() => onMark(song.id)} type="button">
          <strong>{song.title}</strong><span>{song.artist}</span>
        </button>)}
      </section>
      {!game.game.lineClaimed && !game.player.eliminated ? <button className="button" disabled={gameFinished || !canClaimLine} onClick={onClaimLine} type="button">Reclamar línea vertical (4 canciones)</button> : null}
      {!game.game.fullCardClaimed && !game.player.eliminated ? <button className="button" disabled={gameFinished || !canClaimFullCard} onClick={onClaimFullCard} type="button">¡Bingo!</button> : null}
      {error ? <FeedbackModal message={error} onClose={() => setError(null)} /> : null}
    </>;
  }

  return <section className="panel">
    <p className="field-label">UNIRSE A LA PARTIDA</p>
    <form onSubmit={onSubmit}>
      <label className="field-label" htmlFor="playerName">TU NOMBRE</label>
      <input
        className="field"
        id="playerName"
        maxLength={50}
        name="playerName"
        onChange={(event) => setEnteredName(event.target.value)}
        required
        value={name}
      />
      <button className="button" disabled={joining} type="submit">
        {joining ? "Entrando…" : "Entrar a jugar"}
      </button>
    </form>
    {error ? <FeedbackModal message={error} onClose={() => setError(null)} /> : null}
  </section>;
}
