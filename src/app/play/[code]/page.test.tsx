import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/player-game", () => ({
  default: ({ joinCode }: { joinCode: string }) => <p>Unirse a la partida {joinCode}</p>,
}));

import PlayerPage from "./page";

describe("PlayerPage", () => {
  it("hands the join code to the interactive player flow", async () => {
    const page = await PlayerPage({ params: Promise.resolve({ code: "FIESTA1" }) });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("PARTIDA FIESTA1");
    expect(markup).toContain("Unirse a la partida FIESTA1");
    expect(markup).toContain('data-icon="arrow-left"');
  });
});
