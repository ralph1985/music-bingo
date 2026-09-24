import Link from "next/link";

import PlayerGame from "@/components/player-game";

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const joinCode = code.trim().toUpperCase();

  return <main className="shell">
    <header className="topbar"><Link className="back" href="/">← Inicio</Link><span className="status">PARTIDA COMPARTIDA</span></header>
    <p className="eyebrow">PARTIDA {joinCode}</p>
    <h1 className="screen-title">Tu <em>cartón.</em></h1>
    <p className="screen-subtitle">Entra con tu nombre para recibir tu cartón en este dispositivo.</p>
    <PlayerGame joinCode={joinCode} key={joinCode} />
  </main>;
}
