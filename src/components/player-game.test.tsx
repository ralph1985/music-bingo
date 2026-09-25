import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => null,
}));

import PlayerGame from "./player-game";

describe("PlayerGame", () => {
  it("asks the player for a name before joining", () => {
    const markup = renderToStaticMarkup(<PlayerGame joinCode="FIESTA1" />);

    expect(markup).toContain('name="playerName"');
    expect(markup).toContain("Entrar a jugar");
    expect(markup).toContain('data-icon="ticket"');
  });
});
