import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the Firebase Emulator Suite with demo data:
 *   npm run emulators            # terminal 1
 *   npm run seed:demo            # once
 *   npm run test:e2e             # starts `next dev` with .env.emulator if needed
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const bundledChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 120_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(existsSync(bundledChromium) ? { launchOptions: { executablePath: bundledChromium } } : {}),
      },
    },
  ],
  webServer: {
    command: `node --env-file=.env.emulator node_modules/next/dist/bin/next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
