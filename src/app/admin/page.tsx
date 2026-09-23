import Link from "next/link";

export default function AdminPreview() {
  return <main className="shell">
    <header className="topbar"><Link className="back" href="/">← Inicio</Link><span className="brand">KAMIKAZE</span></header>
    <p className="eyebrow">ZONA DE CONTROL</p>
    <h1 className="screen-title">Monta la<br /><em>partida.</em></h1>
    <p className="screen-subtitle">Esta será la entrada exclusiva para quien dirige la música y la partida.</p>
    <section className="panel">
      <span className="status">VISTA PREVIA</span>
      <p className="field-label" style={{ marginTop: 18 }}>CONTRASEÑA DEL ADMINISTRADOR</p>
      <input className="field" type="password" placeholder="Pendiente de configurar" disabled />
      <button className="button" type="button" disabled>Acceder al control</button>
    </section>
    <section className="panel">
      <p className="field-label">PRÓXIMO FLUJO</p>
      <p>Importar canciones, crear el código y compartir el QR. El administrador también recibirá su propio cartón.</p>
    </section>
  </main>;
}