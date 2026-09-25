import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GameLifecycle, PlayerLobby, ResultCelebration } from "./host-game-status";

describe("host game status", () => {
  it("shows the active game stage in an accessible lifecycle", () => {
    const markup = renderToStaticMarkup(<GameLifecycle status="playing" />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Preparar");
    expect(markup).toContain("Inscripciones");
    expect(markup).toContain("En juego");
    expect(markup).toContain('aria-current="step"');
  });

  it("renders a waiting-room roster with player initials", () => {
    const markup = renderToStaticMarkup(<PlayerLobby players={[{ id: "1", name: "Ana Ruiz" }, { id: "2", name: "Beto" }]} />);

    expect(markup).toContain('<strong>2</strong> jugadores en sala');
    expect(markup).toContain("AR");
    expect(markup).toContain("B");
  });

  it("celebrates the winners in the results panel", () => {
    const markup = renderToStaticMarkup(<ResultCelebration fullCardWinner="Luis" lineWinner="Ana" />);

    expect(markup).toContain("¡Bingo!");
    expect(markup).toContain("Luis");
    expect(markup).toContain("Línea");
    expect(markup).toContain("Ana");
  });
});
