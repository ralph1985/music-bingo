import Link from "next/link";

export default function Home() {
  return (
    <main className="landing shell">
      <div className="brand"><span className="brand-dot" /> KAMIKAZE BINGO</div>
      <section className="hero">
        <p className="eyebrow">BINGO MUSICAL · EDICIÓN DIGITAL</p>
        <h1>Que suene.<br /><em>Que marque.</em><br />Que gane.</h1>
        <p className="lede">Una partida compartida, tu cartón en el móvil y toda la música fuera de la pantalla.</p>
      </section>
      <section className="entry-grid" aria-label="Elige cómo participar">
        <Link className="entry-card host-entry" href="/admin">
          <span className="entry-icon">✦</span>
          <span className="entry-label">TENGO EL CONTROL</span>
          <strong>Organizar partida</strong>
          <span>Crear la sesión, cargar canciones y lanzar cada tema.</span>
          <span className="entry-arrow">→</span>
        </Link>
        <Link className="entry-card player-entry" href="/play">
          <span className="entry-icon">♬</span>
          <span className="entry-label">TENGO UN CÓDIGO</span>
          <strong>Entrar a jugar</strong>
          <span>Recibir tu cartón y marcar lo que escuches.</span>
          <span className="entry-arrow">→</span>
        </Link>
      </section>
      <p className="preview-note">Abre una partida o entra con el código que te comparta la organización.</p>
    </main>
  );
}
