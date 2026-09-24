import { expect, test } from "@playwright/test";

test("shows the public entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Bingo Musical Kamikaze/);
  await expect(page.getByRole("link", { name: /organizar partida/i })).toBeVisible();
});
