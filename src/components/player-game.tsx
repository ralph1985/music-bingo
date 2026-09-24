"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState, useSyncExternalStore } from "react";

import { api } from "../../convex/_generated/api";
import { loadLocalGame, saveLocalGame } from "../storage/local-storage";

type PlayerGameProps = {
  joinCode: string;
};

let cachedStoredGame: ReturnType<typeof loadLocalGame> | undefined;

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
      await claimLine({ joinCode, playerIdentity });
    } catch {
      setError("No se pudo comprobar la línea.");
    }
  }

  async function onClaimFullCard() {
    if (!playerIdentity) {
      return;
    }

    try {
      await claimFullCard({ joinCode, playerIdentity });
    } catch {
      setError("No se pudo comprobar el cartón.");
    }
  }

  if (playerIdentity && game === undefined) {
    return <section className="panel"><p>Recuperando tu cartón…</p></section>;
  }

  if (playerIdentity && game) {
    return <>
      <section className="panel">
        <p className="field-label">PARTIDA {game.game.status === "waiting" ? "EN ESPERA" : "EN CURSO"}</p>
        <p>{game.game.calledSongCount} canciones anunciadas. Solo puedes tachar canciones que ya han sonado.</p>
      </section>
      <section className="card-grid" aria-label="Tu cartón musical">
        {game.player.card.songs.map((song) => <button aria-pressed={game.player.markedSongIds.includes(song.id)} className="song-cell" disabled={!game.game.calledCardSongIds.includes(song.id)} key={song.id} onClick={() => onMark(song.id)} type="button">
          <strong>{song.title}</strong><span>{song.artist}</span>
        </button>)}
      </section>
      {!game.game.lineClaimed && !game.player.eliminated ? <button className="button" onClick={onClaimLine} type="button">Reclamar línea</button> : null}
      {!game.game.fullCardClaimed && !game.player.eliminated ? <button className="button" onClick={onClaimFullCard} type="button">Reclamar cartón completo</button> : null}
      {error ? <p role="alert">{error}</p> : null}
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
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
