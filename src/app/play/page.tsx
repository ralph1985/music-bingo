import Link from "next/link";

import JoinGame from "@/components/join-game";
import { Icon } from "../../components/icons";

export default function JoinPage() {
  return <main className="shell">
    <header className="topbar"><Link className="back" href="/"><Icon name="arrow-left" /> Inicio</Link><span className="status">PARTIDA COMPARTIDA</span></header>
    <p className="eyebrow">ENTRAR A JUGAR</p>
    <h1 className="screen-title">Tu <em>cartón.</em></h1>
    <p className="screen-subtitle">Introduce el código de la partida que te ha dado quien organiza la música.</p>
    <JoinGame />
  </main>;
}
