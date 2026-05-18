import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

const skipWebServer = process.env.CODEARCH_SKIP_WEB_SERVER === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "npx vite --host 127.0.0.1",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
