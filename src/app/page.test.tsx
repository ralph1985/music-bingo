import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("presenta entradas separadas para administrar y jugar", () => {
    const page = renderToStaticMarkup(<Home />);

    expect(page).toContain("Probar la beta");
    expect(page).toContain('href="mailto:hola@conquense.dev?');
    expect(page).toContain("subject=Quiero%20probar%20la%20beta%20de%20Bingo%20Musical");
    expect(page).toContain("Me%20comprometo%20a%20enviar%20feedback%20despu%C3%A9s%20de%20probarla.");
    expect(page).toContain('data-icon="sliders"');
    expect(page).toContain("Entrar a jugar");
    expect(page).toContain('href="/play"');
    expect(page).toContain('data-icon="ticket"');
    expect(page).toContain("BINGO MUSICAL");
  });
});
