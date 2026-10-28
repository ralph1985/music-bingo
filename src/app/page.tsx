import Link from "next/link";

import { Icon } from "../components/icons";

const betaContactBody = [
  "Hola,",
  "",
  "Quiero probar la beta privada de Bingo Musical.",
  "",
  "Nombre:",
  "Fecha aproximada de la partida:",
  "Número de jugadores:",
  "",
  "Me comprometo a enviar feedback después de probarla.",
  "",
  "Gracias.",
].join("\r\n");
const betaContactHref = `mailto:hola@conquense.dev?subject=${encodeURIComponent("Quiero probar la beta de Bingo Musical")}&body=${encodeURIComponent(betaContactBody)}`;

export default function Home() {
  return (
    <main className="landing shell">
      <div className="brand"><span className="brand-dot" /> BINGO MUSICAL</div>
      <section className="hero">
        <p className="eyebrow">BINGO MUSICAL · BETA PRIVADA GRATUITA</p>
        <h1>Que suene.<br /><em>Que marque.</em><br />Que gane.</h1>
        <p className="lede">Una partida compartida, tu cartón en el móvil y toda la música fuera de la pantalla.</p>
      </section>
      <section className="entry-grid" aria-label="Elige cómo participar">
        <Link className="entry-card host-entry" href="/admin">
          <Icon className="entry-icon" name="sliders" />
          <span className="entry-label">TENGO EL CONTROL</span>
          <strong>Organizar partida</strong>
          <span>Crear la sesión, cargar canciones y lanzar cada tema.</span>
          <Icon className="entry-arrow" name="external-link" />
        </Link>
        <Link className="entry-card player-entry" href="/play">
          <Icon className="entry-icon" name="ticket" />
          <span className="entry-label">TENGO UN CÓDIGO</span>
          <strong>Entrar a jugar</strong>
          <span>Recibir tu cartón y marcar lo que escuches.</span>
          <Icon className="entry-arrow" name="external-link" />
        </Link>
      </section>
      <a className="beta-contact-cta" href={betaContactHref}>
        <span className="entry-label">BETA PRIVADA GRATUITA</span>
        <strong>Probar la beta</strong>
        <span>Escríbenos y te ayudaremos a organizar tu primera partida.</span>
        <Icon className="entry-arrow" name="external-link" />
      </a>
      <p className="preview-note">Abre una partida o entra con el código que te comparta la organización.</p>
    </main>
  );
}
