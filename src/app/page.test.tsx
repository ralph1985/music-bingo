import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("presenta entradas separadas para administrar y jugar", () => {
    const page = renderToStaticMarkup(<Home />);

    expect(page).toContain("Organizar partida");
    expect(page).toContain('href="/admin"');
    expect(page).toContain("Entrar a jugar");
    expect(page).toContain('href="/play"');
  });
});
