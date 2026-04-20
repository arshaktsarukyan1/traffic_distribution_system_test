import { expect, test } from "@playwright/test";

/**
 * Full-stack smoke against nginx (docker compose) or any deployment where
 * PLAYWRIGHT_BASE_URL points at the public entry (default http://localhost).
 *
 * Requires backend/auth DB readiness and a valid user login flow.
 */
test.describe("critical TDS scenario", () => {
  test("dashboard loads and shows global dashboard chrome", async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_E2E !== "1",
      "Set PLAYWRIGHT_E2E=1 and PLAYWRIGHT_BASE_URL (e.g. http://localhost) with stack running.",
    );

    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /global dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/from/i).first()).toBeVisible();
  });
});
