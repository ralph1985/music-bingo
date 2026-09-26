import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => null,
}));

import PlayerGame, { getJoinUnavailableMessage } from "./player-game";

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
});
