import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import QrCode, { QrCodeFullscreen } from "./qr-code";

describe("QrCode", () => {
  it("identifies the player link while the code is generated", () => {
    const markup = renderToStaticMarkup(<QrCode url="https://bingo.conquense.dev/play/FIESTA" />);

    expect(markup).toContain("código QR del enlace de jugadores");
  });

  it("renders an accessible full-screen QR viewer", () => {
    const markup = renderToStaticMarkup(<QrCodeFullscreen onClose={() => undefined} source="data:image/png;base64,code" />);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("CÓDIGO PARA JUGADORES");
    expect(markup).toContain("Cerrar QR ampliado");
  });
});
