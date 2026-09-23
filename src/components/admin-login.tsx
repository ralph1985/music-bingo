"use client";

import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);

    if (!response.ok) {
      setError("No se pudo iniciar sesión.");
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="field-label" htmlFor="admin-password">CONTRASEÑA DEL ADMINISTRADOR</label>
      <input className="field" id="admin-password" name="password" type="password" required autoComplete="current-password" />
      {error ? <p role="alert">{error}</p> : null}
      <button className="button" type="submit" disabled={pending}>{pending ? "Accediendo…" : "Acceder al control"}</button>
    </form>
  );
}
