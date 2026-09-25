import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminTabs, getAdminTabs } from "./admin-tabs";

describe("getAdminTabs", () => {
  it("keeps setup and room available before a game exists", () => {
    expect(getAdminTabs(null)).toEqual([
      { id: "setup", label: "Preparar", disabled: false },
      { id: "room", label: "Sala", disabled: true },
      { id: "calls", label: "Anunciar", disabled: true },
      { id: "results", label: "Resultados", disabled: true },
    ]);
  });

  it("enables the correct controls for each game status", () => {
    expect(getAdminTabs("waiting")).toMatchObject([
      { id: "setup", disabled: false },
      { id: "room", disabled: false },
      { id: "calls", disabled: true },
      { id: "results", disabled: true },
    ]);
    expect(getAdminTabs("playing")).toMatchObject([
      { id: "setup", disabled: false },
      { id: "room", disabled: false },
      { id: "calls", disabled: false },
      { id: "results", disabled: true },
    ]);
    expect(getAdminTabs("completed")).toMatchObject([
      { id: "setup", disabled: false },
      { id: "room", disabled: false },
      { id: "calls", disabled: false },
      { id: "results", disabled: false },
    ]);
  });
});

describe("AdminTabs", () => {
  it("renders an accessible tab list with only the selected panel", () => {
    const markup = renderToStaticMarkup(
      <AdminTabs activeTab="setup" onTabChange={() => {}} status={null}>
        {{
          setup: <p>Preparar contenido</p>,
          room: <p>Sala contenido</p>,
          calls: <p>Anunciar contenido</p>,
          results: <p>Resultados contenido</p>,
        }}
      </AdminTabs>,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain("Preparar contenido");
    expect(markup).not.toContain("Sala contenido");
  });
});
