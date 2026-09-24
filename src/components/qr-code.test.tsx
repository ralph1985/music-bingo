import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import QrCode from "./qr-code";

describe("QrCode", () => {
  it("identifies the player link while the code is generated", () => {
    const markup = renderToStaticMarkup(<QrCode url="https://bingo.conquense.dev/play/FIESTA" />);

    expect(markup).toContain("código QR del enlace de jugadores");
  });
});
