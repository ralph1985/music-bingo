"use client";

import { type FormEvent, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "../../convex/_generated/api";
import { Icon } from "./icons";

type JoinGameProps = {
  initialCode?: string;
};

export default function JoinGame({ initialCode = "" }: JoinGameProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(initialCode);
  const code = joinCode.trim().toUpperCase();
  const validCode = /^[A-Z0-9]{6}$/.test(code);
  const availability = useQuery(api.games.getJoinAvailability, validCode ? { joinCode: code } : "skip");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (availability?.available) {
      router.push(`/play/${code}`);
    }
  }

  return <section className="panel">
    <p className="field-label"><Icon name="ticket" /> UNIRSE A LA PARTIDA</p>
    <form onSubmit={onSubmit}>
      <label className="field-label" htmlFor="joinCode">CÓDIGO DE PARTIDA</label>
      <input
        autoCapitalize="characters"
        autoComplete="off"
        className="field join-code-input"
        id="joinCode"
        maxLength={6}
        name="joinCode"
        onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
        placeholder="EJ. FIESTA"
        required
        value={joinCode}
      />
      {code.length > 0 && !validCode ? <p role="alert">El código debe tener 6 caracteres.</p> : null}
      {validCode && availability === undefined ? <p role="status">Comprobando el código…</p> : null}
      {validCode && availability && !availability.available ? <p role="alert">No hay una partida disponible con este código. Comprueba el código o pide uno nuevo a la organización.</p> : null}
      <button className="button" disabled={!availability?.available} type="submit"><Icon name="play" /> Continuar</button>
    </form>
  </section>;
}
