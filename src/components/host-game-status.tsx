type GameStatus = "waiting" | "playing" | "completed";
type Player = { id: string; name: string };

import { Icon } from "./icons";

const stages = [
  { id: "setup", label: "Preparar" },
  { id: "waiting", label: "Inscripciones" },
  { id: "playing", label: "En juego" },
  { id: "completed", label: "Resultados" },
] as const;

export function GameLifecycle({ status }: { status: GameStatus }) {
  const activeStage = status === "waiting" ? "waiting" : status;

  return <section aria-label="Estado de la partida" className="game-lifecycle" role="status">
    <span className="field-label">ESTADO DE LA PARTIDA</span>
    <ol>
      {stages.map((stage) => <li aria-current={stage.id === activeStage ? "step" : undefined} className={stage.id === activeStage ? "is-active" : undefined} key={stage.id}>{stage.label}</li>)}
    </ol>
  </section>;
}

export function PlayerLobby({ players }: { players: Player[] }) {
  return <section aria-live="polite" className="player-lobby">
    <p className="field-label"><Icon name="users" /> SALA DE ESPERA</p>
    <p><strong>{players.length}</strong> jugador{players.length === 1 ? "" : "es"} en sala</p>
    {players.length > 0 ? <ul>{players.map((player) => <li key={player.id}><span aria-hidden="true" className="player-avatar">{initials(player.name)}</span><span>{player.name}</span></li>)}</ul> : <p className="player-lobby-empty">Aún no se ha unido nadie. Comparte el código o el QR.</p>}
  </section>;
}

export function ResultCelebration({ fullCardWinner, lineWinner }: { fullCardWinner: string; lineWinner: string }) {
  return <section className="result-celebration">
    <div aria-hidden="true" className="celebration-sparkles">✦ ✧ ✦</div>
    <p className="field-label">RESULTADO DE LA RONDA</p>
    <div className="result-winner result-winner-main"><span><Icon name="trophy" /> ¡Bingo!</span><strong>{fullCardWinner}</strong></div>
    <div className="result-winner"><span><Icon name="columns" /> Línea</span><strong>{lineWinner}</strong></div>
  </section>;
}

function initials(name: string): string {
  const values = name.trim().split(/\s+/).filter(Boolean);
  return values.slice(0, 2).map((value) => value[0]?.toUpperCase()).join("") || "?";
}
