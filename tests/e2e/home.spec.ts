import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("halaman utama boleh dicapai dan lulus semakan aksesibiliti", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Perancang Pakej Haji PJH");
  await expect(page.locator("html")).toHaveAttribute("lang", "ms");

  // Tiada skrol mendatar halaman (UI UX Pro Max: Layout & Responsive)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
