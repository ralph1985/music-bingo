import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => null,
}));

import PlayerGame, { FinishedGameModal, getFinishedGameMessage, getJoinUnavailableMessage } from "./player-game";

describe("PlayerGame", () => {
  it("asks the player for a name before joining", () => {
    const markup = renderToStaticMarkup(<PlayerGame joinCode="FIESTA1" />);

    expect(markup).toContain('name="playerName"');
    expect(markup).toContain("Entrar a jugar");
    expect(markup).toContain('data-icon="ticket"');
  });

  it("lets a new player choose a fixed number of cards", () => {
    const markup = renderToStaticMarkup(<PlayerGame joinCode="FIESTA1" />);

    expect(markup).toContain('name="cardCount"');
    expect(markup).toContain("La cantidad queda fijada al entrar.");
    expect(markup).toContain("2 cartones");
  });

  it("explains when a shared game no longer accepts entrants", () => {
    expect(getJoinUnavailableMessage(false)).toBe("Esta partida ya no admite nuevos jugadores.");
    expect(getJoinUnavailableMessage(true)).toBeNull();
  });

  it("announces the end of a completed game in a player-facing message", () => {
    expect(getFinishedGameMessage("completed")).toBe("La partida ha terminado. Gracias por jugar.");
    expect(getFinishedGameMessage("cancelled")).toBe("La partida fue cancelada por el anfitrión.");

    const markup = renderToStaticMarkup(<FinishedGameModal message={getFinishedGameMessage("completed")} onClose={() => undefined} />);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("FIN DE LA PARTIDA");
    expect(markup).toContain("Partida terminada");
    expect(markup).toContain("Ver mi cartón");
  });
});
