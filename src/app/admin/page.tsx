import Link from "next/link";

import AdminLogin from "@/components/admin-login";

export default function AdminPreview() {
  return <main className="shell">
    <header className="topbar"><Link className="back" href="/">← Inicio</Link><span className="brand">KAMIKAZE</span></header>
    <p className="eyebrow">ZONA DE CONTROL</p>
    <h1 className="screen-title">Monta la<br /><em>partida.</em></h1>
    <p className="screen-subtitle">Esta será la entrada exclusiva para quien dirige la música y la partida.</p>
    <section className="panel">
      <span className="status">ACCESO DEL ADMINISTRADOR</span>
      <div style={{ marginTop: 18 }}><AdminLogin /></div>
    </section>
    <section className="panel">
      <p className="field-label">PRÓXIMO FLUJO</p>
      <p>Importar canciones, crear el código y compartir el QR. El administrador también recibirá su propio cartón.</p>
    </section>
  </main>;
}