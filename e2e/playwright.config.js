// Purpose: Playwright configuration per Part 9 Step 2 specifications
const { defineConfig } = require("@playwright/test");
const path = require("path");

module.exports = defineConfig({
  testDir: path.resolve(__dirname, "tests"),
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve("./global-setup"),
  reporter: [
    ["list"],
    ["json", { outputFile: path.resolve(__dirname, "results.json") }]
  ],
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      "x-playwright-test": "true"
    },
    trace: "off",
    screenshot: "off",
    video: "off"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
