import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const priceOf = (t: string | null) => Number((t ?? "").replace(/[^\d.]/g, ""));

test("semak pakej: pilih Busyra, pakej disusun dari harga terendah", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Utama" })
    .getByRole("link", { name: "Semak pakej" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Semak pakej");

  await page.getByLabel("PJH").selectOption("busyra");
  await expect(page).toHaveURL(/\/pakej\?pjh=busyra/);
  await expect(page.getByRole("heading", { level: 2, name: /Busyra/ })).toBeVisible();

  const cards = page.locator("article");
  expect(await cards.count()).toBeGreaterThan(1);
  const from = await cards.locator("header .money").allTextContents();
  const prices = from.map(priceOf);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  await expect(page.getByText("Kelulusan belum disahkan").first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("semak pakej: PJH tidak wujud memberi mesej jelas", async ({ page }) => {
  await page.goto("/pakej?pjh=tiada-pjh");
  await expect(page.getByRole("alert").filter({ hasText: "tiada dalam katalog" })).toBeVisible();
});
