import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PlaylistImport from "./playlist-import";

describe("PlaylistImport", () => {
  it("keeps game creation unavailable until a playlist has been reviewed", () => {
    const markup = renderToStaticMarkup(<PlaylistImport />);

    expect(markup).toContain("Previsualizar lista");
    expect(markup).not.toContain("Crear partida");
    expect(markup).toContain("Mínimo: 24 canciones");
    expect(markup).toContain("Recomendamos entre 30 y 45 canciones");
  });

  it("starts the administrator dashboard on the setup tab", () => {
    const markup = renderToStaticMarkup(<PlaylistImport />);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain("Preparar");
    expect(markup).toContain("LISTA DE CANCIONES");
    expect(markup).not.toContain("CANCIONES PENDIENTES");
  });
});
