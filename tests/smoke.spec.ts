import { expect, test } from "@playwright/test";

test("shows the public entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Bingo Musical/);
  await expect(page.getByRole("link", { name: /organizar partida/i })).toBeVisible();
});

test("rejects an unavailable six-character game code before player entry", async ({ page }) => {
  await page.goto("/play");

  await page.getByLabel("CÓDIGO DE PARTIDA").fill("ZZZZZZ");

  await expect(page.getByText("No hay una partida disponible", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});
