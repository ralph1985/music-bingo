import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Icon } from "./icons";

describe("Icon", () => {
  it("renders an accessible decorative SVG with the requested glyph", () => {
    const markup = renderToStaticMarkup(<Icon aria-hidden="true" name="trophy" />);

    expect(markup).toContain("<svg");
    expect(markup).toContain('data-icon="trophy"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
