import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Footer from "./footer";

describe("Footer", () => {
  it("atribuye la web a conquense.dev con un enlace y logotipo", () => {
    const footer = renderToStaticMarkup(<Footer />);

    expect(footer).toContain("Hecho por");
    expect(footer).toContain('href="https://www.conquense.dev"');
    expect(footer).toContain('alt="conquense.dev"');
  });

  it("ofrece un acceso visible al repositorio para contribuir", () => {
    const footer = renderToStaticMarkup(<Footer />);

    expect(footer).toContain("Contribuir en GitHub");
    expect(footer).toContain('href="https://github.com/ralph1985/music-bingo"');
  });
});
