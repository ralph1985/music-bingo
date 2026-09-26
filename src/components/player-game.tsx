"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState, useSyncExternalStore } from "react";

import { api } from "../../convex/_generated/api";
import { MAX_CARDS_PER_PLAYER } from "../../shared/card-config";
import { loadLocalGame, saveLocalGame } from "../storage/local-storage";
import { Icon } from "./icons";

type PlayerGameProps = {
  joinCode: string;
};

function FeedbackModal({ message, onClose }: { message: string; onClose: () => void }) {
  const won = message.startsWith("¡");

  return <div aria-labelledby="feedback-title" className="modal-backdrop" role="dialog" aria-modal="true">
    <section className="modal-card">
      <p className="field-label">RESULTADO DE LA JUGADA</p>
      <h2 id="feedback-title"><Icon name={won ? "check-circle" : "alert-circle"} /> {won ? "¡Enhorabuena!" : "Revisa tu cartón"}</h2>
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
  const [cardCount, setCardCount] = useState(1);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
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
        cardCount,
        joinCode,
        name: normalizedName,
        playerIdentity: identity,
      });

      saveLocalGame(window.localStorage, {
        cards: joinedPlayer.cards,
        gameId: joinCode,
        player: { id: identity, name: normalizedName },
      });
      setJoinedIdentity(identity);
    } catch {
      setError("No se pudo entrar en esta partida.");
    } finally {
      setJoining(false);
    }
  }

  async function onMark(cardId: string, songId: string) {
    if (!playerIdentity) {
      return;
    }

    try {
      await markCell({ cardId, joinCode, playerIdentity, songId });
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
    const activeCard = game.player.cards[activeCardIndex] ?? game.player.cards[0];
    const canClaimLine = game.player.cards.some((card) => hasMarkedVerticalLine(card.markedSongIds, card.songs.map((song) => song.id)));
    const canClaimFullCard = game.player.cards.some((card) => card.songs.every((song) => card.markedSongIds.includes(song.id)));
    const gameFinished = game.game.status === "completed" || game.game.status === "cancelled";
    const statusLabel = game.game.status === "waiting" ? "EN ESPERA" : game.game.status === "playing" ? "EN CURSO" : game.game.status === "completed" ? "FINALIZADA" : "CANCELADA";
    const statusIcon = game.game.status === "waiting" ? "ticket" : game.game.status === "playing" ? "radio" : game.game.status === "completed" ? "check-circle" : "ban";

    return <>
      <section className="panel">
        <p className="field-label"><Icon name={statusIcon} /> PARTIDA {statusLabel}</p>
        <p>{gameFinished ? "La partida ha terminado. Gracias por jugar." : `${game.game.calledSongCount} canciones anunciadas. La línea se completa en vertical: 4 canciones de una columna. Puedes marcar y corregir tu cartón; se validará al reclamar.`}</p>
      </section>
      {game.player.cards.length > 1 ? <nav aria-label="Seleccionar cartón" className="card-tabs">
        {game.player.cards.map((card, index) => <button aria-current={index === activeCardIndex ? "page" : undefined} className="card-tab" key={card.id} onClick={() => setActiveCardIndex(index)} type="button">Cartón {index + 1} de {game.player.cards.length}</button>)}
      </nav> : null}
      <section className="card-grid" aria-label={`Tu cartón musical ${activeCardIndex + 1}`}>
        {activeCard.songs.map((song) => <button aria-pressed={activeCard.markedSongIds.includes(song.id)} className="song-cell" disabled={gameFinished} key={song.id} onClick={() => onMark(activeCard.id, song.id)} type="button">
          <strong>{song.title}</strong><span>{song.artist}</span>
        </button>)}
      </section>
      {!game.game.lineClaimed && !game.player.eliminated ? <button className="button" disabled={gameFinished || !canClaimLine} onClick={onClaimLine} type="button"><Icon name="columns" /> Reclamar línea vertical (4 canciones)</button> : null}
      {!game.game.fullCardClaimed && !game.player.eliminated ? <button className="button" disabled={gameFinished || !canClaimFullCard} onClick={onClaimFullCard} type="button"><Icon name="trophy" /> ¡Bingo!</button> : null}
      {error ? <FeedbackModal message={error} onClose={() => setError(null)} /> : null}
    </>;
  }

  return <section className="panel">
    <p className="field-label"><Icon name="ticket" /> UNIRSE A LA PARTIDA</p>
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
      <label className="field-label" htmlFor="cardCount">NÚMERO DE CARTONES</label>
      <select className="field" id="cardCount" name="cardCount" onChange={(event) => setCardCount(Number(event.target.value))} value={cardCount}>
        {Array.from({ length: MAX_CARDS_PER_PLAYER }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? "cartón" : "cartones"}</option>)}
      </select>
      <p>La cantidad queda fijada al entrar.</p>
      <button className="button" disabled={joining} type="submit">
        <Icon name="play" /> {joining ? "Entrando…" : "Entrar a jugar"}
      </button>
    </form>
    {error ? <FeedbackModal message={error} onClose={() => setError(null)} /> : null}
  </section>;
}
