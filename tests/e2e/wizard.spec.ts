import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
};

const noHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
};

const next = (page: Page) => page.getByRole("button", { name: "Seterusnya" }).click();
const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test("pasangan RM100,000: wizard hingga hasil penilaian", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Mula penilaian" }).click();
  await expect(heading(page)).toHaveText("Mula");
  await expect(page.getByText("Langkah 1 daripada 5")).toBeVisible();

  // Cubaan meneruskan tanpa bajet: ringkasan ralat difokus, ralat di bawah medan.
  await next(page);
  const summary = page.getByRole("alert", { name: /Sila betulkan/ });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Masukkan bajet seorang");
  const budget = page.getByLabel("Bajet seorang (RM)");
  await expect(budget).toHaveAttribute("aria-invalid", "true");
  await axe(page);

  await budget.fill("100000");
  await budget.blur();
  await expect(budget).toHaveValue("100,000");
  await expect(summary).toHaveCount(0);
  await noHorizontalScroll(page);
  await next(page);

  await expect(heading(page)).toHaveText("Bilik");
  await expect(heading(page)).toBeFocused();
  await page.getByLabel("Bilik Aziziyah").selectOption("2");
  await noHorizontalScroll(page);
  await axe(page);
  await next(page);

  await expect(heading(page)).toHaveText("Perjalanan");
  await page
    .getByRole("group", { name: "Penginapan di Aziziyah" })
    .getByRole("radio", { name: "Wajib ada" })
    .click();
  await expect(
    page.getByLabel("Terima Aziziyah yang tertakluk kepada kebenaran pihak berkuasa"),
  ).toBeChecked();
  await noHorizontalScroll(page);
  await axe(page);
  await next(page);

  await expect(heading(page)).toHaveText("Keutamaan");
  await page.getByRole("button", { name: "Langkau" }).click();

  await expect(heading(page)).toHaveText("Semakan");
  const wajib = page.getByRole("region", { name: "Syarat wajib" });
  await expect(wajib).toContainText("RM 100,000.00");
  await expect(wajib).toContainText("Aziziyah ber-2");
  await expect(wajib).toContainText("Wajib ada");
  await expect(page.locator("main")).not.toContainText(/terjamin|dijamin/i);
  await noHorizontalScroll(page);
  await axe(page);

  // "Ubah" kembali ke langkah berkaitan dan pilihan kekal.
  await page.getByRole("button", { name: /^Ubah Bajet seorang/ }).click();
  await expect(heading(page)).toHaveText("Mula");
  await expect(page.getByLabel("Bajet seorang (RM)")).toHaveValue("100,000");
  await page.goBack();
  await expect(heading(page)).toHaveText("Semakan");

  await page.getByRole("button", { name: "Nilai pakej" }).click();
  await expect(page).toHaveURL(/\/hasil$/);
  await expect(heading(page)).toHaveText("Hasil penilaian", { timeout: 30_000 });
  await expect(page.getByText(/pakej memenuhi syarat wajib, \d+ perlu pengesahan/)).toBeVisible();
  await expect(page.getByLabel("Liputan dan batasan data")).toContainText("belum disahkan");
  await expect(page.locator("main")).not.toContainText(/terjamin|dijamin/i);
  await noHorizontalScroll(page);
  await axe(page);
});

test("draf disimpan pada peranti dan pautan langkah yang belum sah dialihkan", async ({ page }) => {
  await page.goto("/nilai?langkah=4");
  await expect(heading(page)).toHaveText("Mula");
  await expect(page).toHaveURL(/langkah=1/);

  await page.getByLabel("Bajet seorang (RM)").fill("80000");
  await next(page);
  await expect(heading(page)).toHaveText("Bilik");
  await page.reload();
  await expect(heading(page)).toHaveText("Bilik");
  await page.getByRole("button", { name: "Kembali" }).click();
  await expect(page.getByLabel("Bajet seorang (RM)")).toHaveValue("80,000");

  await page.getByRole("button", { name: "Mula semula" }).click();
  await page.getByRole("button", { name: "Ya, mula semula" }).click();
  await expect(page.getByLabel("Bajet seorang (RM)")).toHaveValue("");
});

test("hasil tanpa penilaian memaut kembali ke wizard", async ({ page }) => {
  await page.goto("/hasil");
  await expect(heading(page)).toHaveText("Tiada penilaian");
  await expect(page.getByRole("link", { name: "Mula penilaian" })).toHaveAttribute(
    "href",
    "/nilai",
  );
});
