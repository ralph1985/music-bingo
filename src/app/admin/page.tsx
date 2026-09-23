import { cookies } from "next/headers";
import Link from "next/link";

import AdminLogin from "@/components/admin-login";
import PlaylistImport from "@/components/playlist-import";
import { ADMIN_SESSION_COOKIE, hasAdminSession } from "@/server/auth/admin-session";

export default async function AdminPreview() {
  const cookieStore = await cookies();
  const authenticated = hasAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );

  return <main className="shell">
    <header className="topbar"><Link className="back" href="/">← Inicio</Link><span className="brand">KAMIKAZE</span></header>
    <p className="eyebrow">ZONA DE CONTROL</p>
    <h1 className="screen-title">Monta la<br /><em>partida.</em></h1>
    <p className="screen-subtitle">Esta será la entrada exclusiva para quien dirige la música y la partida.</p>
    {authenticated ? <>
      <section className="panel">
        <span className="status">SESIÓN DEL ADMINISTRADOR ACTIVA</span>
        <p style={{ marginTop: 18 }}>Carga la playlist para previsualizar las canciones antes de crear la partida.</p>
      </section>
      <PlaylistImport />
    </> : <section className="panel">
      <span className="status">ACCESO DEL ADMINISTRADOR</span>
      <div style={{ marginTop: 18 }}><AdminLogin /></div>
    </section>}
  </main>;
}