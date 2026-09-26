import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import EnvironmentBanner from "./environment-banner";

describe("EnvironmentBanner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("identifica staging y muestra la rama de Vercel", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "develop");

    const banner = renderToStaticMarkup(<EnvironmentBanner />);

    expect(banner).toContain("STAGING · develop");
    expect(banner).toContain("No es producción");
    expect(banner).toContain('aria-label="Entorno de la aplicación"');
  });

  it("muestra desarrollo local cuando no hay despliegue de Vercel", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");

    const banner = renderToStaticMarkup(<EnvironmentBanner />);

    expect(banner).toContain("DESARROLLO LOCAL");
    expect(banner).toContain("No es producción");
  });

  it("no se renderiza en producción", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");

    expect(EnvironmentBanner()).toBeNull();
  });
});
