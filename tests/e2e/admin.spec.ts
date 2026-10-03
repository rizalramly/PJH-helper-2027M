import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { E2E_ADMIN } from "../../playwright.config";

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("iframe")
    .analyze();
  expect(results.violations).toEqual([]);
};

const noHorizontalScroll = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
};

async function login(page: Page, next = "/admin") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/admin\/log-masuk/);
  await page.getByLabel("Emel").fill(E2E_ADMIN.email);
  await page.getByLabel("Kata laluan").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Log masuk" }).click();
  await expect(page.getByText("Panel pentadbir")).toBeVisible({ timeout: 20_000 });
}

test("tanpa sesi: halaman diubah hala ke log masuk dan API memulangkan 401", async ({
  page,
  request,
}) => {
  await page.goto("/admin/terbit");
  await expect(page).toHaveURL(/\/admin\/log-masuk\?next=%2Fadmin%2Fterbit/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log masuk pentadbir");
  await axe(page);
  await noHorizontalScroll(page);
  for (const path of [
    "/api/admin/drafts",
    "/api/admin/versions",
    "/api/admin/sources",
    "/api/admin/audit",
  ]) {
    const res = await request.get(path);
    expect(res.status()).toBe(401);
  }
  const post = await request.post("/api/admin/publish", {
    data: { seasonId: "1448H", pjhIds: ["thts"] },
  });
  expect(post.status()).toBe(401);
});

test("kata laluan salah memaparkan ralat generik", async ({ page }) => {
  await page.goto("/admin/log-masuk");
  await page.getByLabel("Emel").fill(E2E_ADMIN.email);
  await page.getByLabel("Kata laluan").fill("bukan-kata-laluan-ini");
  await page.getByRole("button", { name: "Log masuk" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Emel atau kata laluan tidak sah." }),
  ).toBeVisible();
});

test("muat naik bukan PDF ditolak", async ({ page }) => {
  await login(page, "/admin/sumber");
  await page.getByLabel(/Fail PDF/).setInputFiles({
    name: "bukan-pdf.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("MZ ini bukan dokumen PDF"),
  });
  await page.getByRole("button", { name: "Muat naik" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "bukan PDF" })).toBeVisible();
  await axe(page);
  await noHorizontalScroll(page);
});

test("draf → semakan → terbit → rollback", async ({ page, request }, testInfo) => {
  // Mengubah katalog aktif dalam stor E2E: dijalankan sekali sahaja (desktop) supaya tidak bertembung.
  test.skip(testInfo.project.name !== "desktop", "aliran terbit dijalankan pada desktop sahaja");
  test.setTimeout(120_000);
  await login(page, "/admin/pjh");
  await axe(page);

  await page.getByRole("button", { name: "Buka draf: Tabung Haji Travel" }).click();
  await expect(page).toHaveURL(/\/admin\/pjh\/thts$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Validasi pra-terbit lulus")).toBeVisible();
  await expect(page.getByTitle(/Dokumen sumber, halaman PDF 3/)).toBeVisible();

  // Sunting harga varian DELIMA 4 dengan bukti halaman
  await page.locator("summary").getByText("Pakej Delima", { exact: true }).first().click();
  const form = page.getByRole("form", { name: "Varian DELIMA 4 ber-4" });
  await form.getByLabel("Harga seorang (RM)").fill("55,000");
  await form.getByLabel("Petikan seperti dicetak").fill("DELIMA 4 RM55,000 (ujian E2E)");
  await form.getByRole("button", { name: "Simpan varian" }).click();
  await expect(page.getByText("Varian DELIMA 4 disimpan.")).toBeVisible();
  await expect(page.getByText(/RM 54,990\.00 → RM 55,000\.00/)).toBeVisible();
  await axe(page);

  await page.getByLabel("Nota semakan (pilihan)").fill("Disemak dengan hlm. 3 (E2E)");
  await page.getByRole("button", { name: "Luluskan semakan" }).click();
  await expect(page.getByText(/Semakan diluluskan/)).toBeVisible();

  // Terbit
  await page.goto("/admin/terbit");
  const before = (await (await request.get("/api/coverage?season=1448H")).json())
    .datasetVersion as string;
  await page.getByRole("button", { name: /Terbitkan 1 draf/ }).click();
  await expect(page.getByText(/Diterbitkan sebagai versi ds-1448h-/)).toBeVisible({
    timeout: 30_000,
  });
  const after = (await (await request.get("/api/coverage?season=1448H")).json()) as {
    datasetVersion: string;
    coverage: { totals: { variantsPublished: number } };
  };
  expect(after.datasetVersion).not.toBe(before);
  expect(after.coverage.totals.variantsPublished).toBeGreaterThan(0);
  const pkgs = await (await request.get("/api/catalog/packages?season=1448H&pjh=thts")).json();
  expect(JSON.stringify(pkgs)).toContain("RM 55,000.00");
  await axe(page);

  // Rollback: versi sebelum diaktifkan semula; tiada snapshot dibuang.
  const row = page.getByRole("listitem").filter({ hasText: before });
  await row.getByRole("button", { name: /Aktifkan semula/ }).click();
  await row.getByRole("button", { name: "Sahkan aktifkan" }).click();
  await expect(page.getByText(`Versi ${before} kini aktif.`)).toBeVisible({ timeout: 30_000 });
  const rolled = await (await request.get("/api/coverage?season=1448H")).json();
  expect(rolled.datasetVersion).toBe(before);
  const pkgsAfter = await (await request.get("/api/catalog/packages?season=1448H&pjh=thts")).json();
  expect(JSON.stringify(pkgsAfter)).not.toContain("RM 55,000.00");
  await expect(page.getByText(/Sejarah versi \(2\)/)).toBeVisible();

  await page.goto("/admin/audit");
  await expect(page.getByRole("cell", { name: "Terbit versi" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Luluskan semakan" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Aktifkan versi" }).first()).toBeVisible();
  await axe(page);
});
