import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site metadata", () => {
  it("uses a neutral bingo title", () => {
    const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

    expect(layout).toContain('title: "Bingo Musical",');
  });
});
