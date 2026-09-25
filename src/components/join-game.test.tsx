import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("convex/react", () => ({ useQuery: () => undefined }));

import JoinGame from "./join-game";

describe("JoinGame", () => {
  it("asks for a game code before navigating to a game", () => {
    const markup = renderToStaticMarkup(<JoinGame />);

    expect(markup).toContain('name="joinCode"');
    expect(markup).toContain('maxLength="6"');
    expect(markup).toContain("CÓDIGO DE PARTIDA");
    expect(markup).toContain("Continuar");
    expect(markup).toContain('data-icon="ticket"');
    expect(markup).toContain('data-icon="play"');
    expect(markup).toContain("disabled");
  });
});
