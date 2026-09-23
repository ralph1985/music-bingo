import Link from "next/link";

const previewSongs = [["Hips Don’t Lie", "Shakira"], ["La Flaca", "Jarabe de Palo"], ["Mr. Brightside", "The Killers"], ["20 de abril", "Celtas Cortos"], ["Dancing Queen", "ABBA"], ["Cadillac solitario", "Loquillo"], ["Livin’ on a Prayer", "Bon Jovi"], ["A quién le importa", "Alaska"], ["Freed From Desire", "Gala"], ["Mediterráneo", "Serrat"], ["I Will Survive", "Gloria Gaynor"], ["Salir", "Extremoduro"]];

export default async function PlayerPreview({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <main className="shell">
    <header className="topbar"><Link className="back" href="/">← Inicio</Link><span className="status">CONECTADO · DEMO</span></header>
    <p className="eyebrow">PARTIDA {code.toUpperCase()}</p>
    <h1 className="screen-title">Tu <em>cartón.</em></h1>
    <p className="screen-subtitle">Escucha fuera de la web. Marca la canción cuando la reconozcas.</p>
    <section className="panel"><p className="field-label">SEÑAL DE PARTIDA</p><p>La próxima canción está a punto de sonar.</p></section>
    <section className="card-grid" aria-label="Cartón musical de demostración">
      {previewSongs.map(([title, artist]) => <article className="song-cell" key={title}><strong>{title}</strong><span>{artist}</span></article>)}
    </section>
  </main>;
}