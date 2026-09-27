import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site metadata", () => {
  it("uses a neutral bingo title", () => {
    const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

    expect(layout).toContain('title: "Bingo Musical",');
  });

  it("keeps the page background fixed instead of applying scroll parallax", () => {
    const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(layout).not.toContain("ScrollBackground");
    expect(styles).not.toContain("background-shift");
    expect(styles).not.toContain("translate3d(0");
    expect(styles).toContain("position: fixed;");
  });
});
