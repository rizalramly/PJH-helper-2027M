import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);

// Stor setempat terpencil untuk E2E (dicipta semula oleh global-setup); bukan data sebenar.
export const E2E_STORE = ".data/e2e-store";
export const E2E_ADMIN = {
  email: "pentadbir-e2e@contoh.my",
  password: "kata-laluan-e2e-sahaja-123",
};

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Lebar ujian mengikut DoD 12: telefon dan desktop
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      PJH_LOCAL_STORE: E2E_STORE,
      AUTH_SECRET: "e2e-rahsia-sesi-bukan-untuk-production-0123456789",
    },
    timeout: 120_000,
  },
});
