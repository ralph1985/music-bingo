"use client";

import { type FormEvent, useState } from "react";

type JoinGameProps = {
  initialCode?: string;
};

export default function JoinGame({ initialCode = "" }: JoinGameProps) {
  const [joinCode, setJoinCode] = useState(initialCode);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();

    if (code) {
      window.location.assign(`/play/${encodeURIComponent(code)}`);
    }
  }

  return <section className="panel">
    <p className="field-label">UNIRSE A LA PARTIDA</p>
    <form onSubmit={onSubmit}>
      <label className="field-label" htmlFor="joinCode">CÓDIGO DE PARTIDA</label>
      <input
        autoCapitalize="characters"
        autoComplete="off"
        className="field join-code-input"
        id="joinCode"
        maxLength={12}
        name="joinCode"
        onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
        placeholder="EJ. FIESTA"
        required
        value={joinCode}
      />
      <button className="button" type="submit">Continuar</button>
    </form>
  </section>;
}
