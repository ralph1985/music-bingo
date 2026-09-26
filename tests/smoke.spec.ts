import { expect, test } from "@playwright/test";

test("shows the public entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Bingo Musical/);
  await expect(page.getByRole("link", { name: /organizar partida/i })).toBeVisible();
});

test("shows the staging environment marker", async ({ page }) => {
  await page.goto("/");

  const banner = page.getByLabel("Entorno de la aplicación");
  await expect(banner).toContainText("STAGING · develop");
  await expect(banner).toContainText("No es producción");
});

test("loads the admin entry point without an active session", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: /Monta la partida/i })).toBeVisible();
  await expect(page.getByLabel("CONTRASEÑA DEL ADMINISTRADOR")).toBeVisible();
});

test("rejects an unavailable six-character game code before player entry", async ({ page }) => {
  await page.goto("/play");

  await page.getByLabel("CÓDIGO DE PARTIDA").fill("ZZZZZZ");

  await expect(page.getByText("No hay una partida disponible", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});

test("does not overflow horizontally on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByLabel("Entorno de la aplicación")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
