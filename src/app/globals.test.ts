import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global icon styles", () => {
  it("keeps SVG icons compact and aligned in controls", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(css).toContain(".icon { width: 1.1em; height: 1.1em;");
    expect(css).toContain(".button { display: inline-flex; align-items: center; justify-content: center; gap: 8px;");
    expect(css).toContain(".back, .field-label, .admin-tab, .result-winner span { display: inline-flex;");
  });
});
