import { describe, expect, it } from "vitest";

import { playerGameUrl } from "./player-game-url";

describe("playerGameUrl", () => {
  it("builds a player-only URL from the public origin and join code", () => {
    expect(playerGameUrl("https://bingo.conquense.dev", "FIESTA")).toBe(
      "https://bingo.conquense.dev/play/FIESTA",
    );
  });
});
