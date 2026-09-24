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

  if (playerIdentity && game === undefined) {
    return <section className="panel"><p>Recuperando tu cartón…</p></section>;
  }

  if (playerIdentity && game) {
    return <>
      <section className="panel">
        <p className="field-label">PARTIDA {game.game.status === "waiting" ? "EN ESPERA" : "EN CURSO"}</p>
        <p>{game.game.calledSongCount} canciones anunciadas.</p>
      </section>
      <section className="card-grid" aria-label="Tu cartón musical">
        {game.player.card.songs.map((song) => <article className="song-cell" key={song.id}>
          <strong>{song.title}</strong><span>{song.artist}</span>
        </article>)}
      </section>
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
