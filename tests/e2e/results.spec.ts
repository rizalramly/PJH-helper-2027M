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

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

/** Isi wizard melalui UI: pasangan, bajet seorang, Aziziyah wajib. */
async function assessCouple(page: Page, budget = "100000") {
  await page.goto("/nilai");
  await page.getByLabel("Bajet seorang (RM)").fill(budget);
  await page.getByRole("button", { name: "Seterusnya" }).click();
  await page.getByLabel("Bilik Aziziyah").selectOption("2");
  await page.getByRole("button", { name: "Seterusnya" }).click();
  await page
    .getByRole("group", { name: "Penginapan di Aziziyah" })
    .getByRole("radio", { name: "Wajib ada" })
    .click();
  await page.getByRole("button", { name: "Seterusnya" }).click();
  await page.getByRole("button", { name: "Langkau" }).click();
  await page.getByRole("button", { name: "Nilai pakej" }).click();
  await expect(heading(page)).toHaveText(/Hasil penilaian|Tiada penilaian/, { timeout: 30_000 });
}

test("hasil: kad cadangan, penjelasan skor dan kepelbagaian PJH", async ({ page }) => {
  await assessCouple(page);
  await expect(heading(page)).toHaveText("Hasil penilaian");
  const recs = page.getByRole("region", { name: /^Cadangan/ }).getByRole("article");
  await expect(recs.first()).toContainText("Cadangan utama");
  await expect(recs.first()).toContainText("Kelulusan PJH musim ini belum disahkan");
  await expect(page.getByLabel("Liputan dan batasan data")).toContainText("33 daripada 34 PJH");

  await recs.first().getByText("Bagaimana skor dikira").click();
  await expect(recs.first().getByRole("table", { name: "Pecahan skor kesesuaian" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/terjamin|dijamin/i);
  await noHorizontalScroll(page);
  await axe(page);

  await page.getByLabel("Utamakan kepelbagaian PJH").check();
  await expect(heading(page)).toHaveText("Hasil penilaian", { timeout: 30_000 });
  const pjhNames = await page
    .getByRole("region", { name: /^Cadangan/ })
    .getByRole("article")
    .evaluateAll((els) =>
      els.map((e) => e.querySelector("header p.text-muted-foreground")?.textContent ?? ""),
    );
  expect(new Set(pjhNames).size).toBe(pjhNames.length);
});

test("banding 2 pakej dan sebab beza harga", async ({ page }) => {
  await assessCouple(page);
  const boxes = page.getByLabel(/Pilih untuk dibanding/);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  const tray = page.getByRole("region", { name: "Pilihan untuk dibanding" });
  await expect(tray).toContainText("2 daripada 3 dipilih");
  await tray.getByRole("link", { name: "Bandingkan" }).click();

  await expect(heading(page)).toHaveText("Banding 2 pakej", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Mengapa harga berbeza" })).toBeVisible();
  await page.getByLabel("Papar perkara yang berbeza sahaja").check();
  await expect(
    page.getByText("berbeza", { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await noHorizontalScroll(page);
  await axe(page);

  // Pilihan kekal apabila kembali ke hasil.
  await page.getByRole("link", { name: "Kembali ke hasil" }).click();
  await expect(page.getByRole("region", { name: "Pilihan untuk dibanding" })).toContainText(
    "2 daripada 3",
  );
});

test("laporan cetak: input, versi, cadangan dan sumber", async ({ page }) => {
  await assessCouple(page);
  await page.getByRole("link", { name: "Laporan dan cetak" }).click();
  await expect(heading(page)).toHaveText("Laporan penilaian pakej haji 1448H", {
    timeout: 30_000,
  });
  const main = page.locator("main");
  for (const t of ["Tarikh penilaian", "Versi data", "Peraturan skor", "Keperluan anda"]) {
    await expect(main).toContainText(t);
  }
  await expect(main).toContainText("Soalan kepada PJH");
  await expect(main).toContainText("hlm. PDF");
  await expect(main.locator("details")).toHaveCount(0);
  await noHorizontalScroll(page);
  await axe(page);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Cetak / simpan PDF" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Utama" })).toBeHidden();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});

test("tiada padanan: penjelasan dan calon terdekat tanpa melonggarkan syarat", async ({ page }) => {
  await assessCouple(page, "30000");
  await expect(heading(page)).toHaveText("Hasil penilaian");
  const box = page.getByRole("region", { name: /Tiada pakej yang memenuhi/ });
  await expect(box).toBeVisible();
  await expect(box).toContainText("Calon terdekat");
  await expect(box).toContainText("tidak dilonggarkan secara automatik");
  await expect(page.getByRole("region", { name: /^Cadangan/ })).toHaveCount(0);
  await axe(page);
});

test("liputan data: metrik berasingan dan jurang menghalang", async ({ page }) => {
  await page.goto("/liputan");
  await expect(heading(page)).toHaveText("Liputan data");
  await expect(page.locator("main")).toContainText("Liputan belum lengkap");
  await expect(page.locator("main")).not.toContainText("34/34 PJH telah diproses");
  const blocking = page.getByRole("region", { name: /Jurang data yang menghalang/ });
  await expect(blocking).toContainText("Jad");
  await expect(page.getByRole("heading", { name: /Setiap PJH \(34\)/ })).toBeVisible();
  await expect(page.locator("main")).toContainText("Kelulusan belum disahkan");
  await noHorizontalScroll(page);
  await axe(page);
});
