// Purpose: Automated screenshot capture saving exactly to docs/assets/screenshots/ per Part 10 specifications
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../../docs/assets/screenshots");

// Helper to save screenshot at exact path
async function snap(page, filename) {
  const targetPath = path.resolve(SCREENSHOTS_DIR, filename);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // Allow render/fonts to stabilize
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`[Captured] ${filename} -> ${targetPath}`);
}

async function logout(page) {
  await page.goto("/login");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("assetdesk_token");
      localStorage.setItem("playwright_test", "true");
    } catch {}
  });
  await page.reload();
  await page.waitForURL("/login", { timeout: 10000 });
}

async function loginAs(page, email, password = "Demo@1234") {
  await logout(page);
  await page.evaluate(() => {
    try {
      localStorage.setItem("playwright_test", "true");
    } catch {}
  });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
}

test.describe.serial("Documentation Screenshots Generation", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("01-login: Capture login screen", async ({ page }) => {
    await logout(page);
    await page.waitForSelector('button[type="submit"]');
    await snap(page, "01-login.png");
  });

  test("02-dashboard-admin: Capture admin dashboard", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/");
    await expect(page.locator("h1.page-title")).toContainText("Dashboard Overview");
    await expect(page.locator(".stat-card").first()).toBeVisible();
    await snap(page, "02-dashboard-admin.png");
  });

  test("03-asset-list: Capture hardware assets inventory table", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "03-asset-list.png");
  });

  test("04-asset-form: Capture add asset form", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets/new");
    await expect(page.locator("#serialNumber")).toBeVisible();
    await snap(page, "04-asset-form.png");
  });

  test("05-asset-detail: Capture asset details view", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().locator('a:has-text("View")').click();
    await expect(page.locator(".page-title")).toBeVisible();
    await expect(page.locator(".detail-card").first()).toBeVisible();
    await snap(page, "05-asset-detail.png");
  });

  test("06-asset-assign-dialog: Capture assign asset modal dialog", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets");
    await page.fill('input[placeholder*="Search"]', "AST-2026-0004");
    await page.click('button:has-text("Search")');
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().locator('a:has-text("View")').click();
    await expect(page.locator(".page-title")).toBeVisible();
    await page.click('button:has-text("Assign")');
    await expect(page.locator(".modal-dialog")).toBeVisible();
    await page.waitForTimeout(200);
    await snap(page, "06-asset-assign-dialog.png");
    await page.click('button:has-text("Cancel")');
  });

  test("07-my-assets-employee: Capture employee personal assets view", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/my-assets");
    await expect(page.locator("h1.page-title")).toContainText("My Assigned Assets");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "07-my-assets-employee.png");
  });

  test("08-license-list: Capture software licenses table", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/licenses");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "08-license-list.png");
  });

  test("09-license-detail: Capture software license detail view", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/licenses");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().locator('a:has-text("View")').click();
    await expect(page.locator(".page-title")).toBeVisible();
    await expect(page.locator(".detail-card").first()).toBeVisible();
    await snap(page, "09-license-detail.png");
  });

  test("10-ticket-list: Capture support tickets desk queue", async ({ page }) => {
    await loginAs(page, "support1@assetdesk.local", "Demo@1234");
    await page.goto("/tickets");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "10-ticket-list.png");
  });

  test("11-ticket-new: Capture new ticket creation form", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/tickets/new");
    await expect(page.locator("#title")).toBeVisible();
    await snap(page, "11-ticket-new.png");
  });

  test("12-ticket-detail: Capture ticket detail with comments and staff controls", async ({ page }) => {
    await loginAs(page, "support1@assetdesk.local", "Demo@1234");
    await page.goto("/tickets");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody tr").first().locator('a:has-text("View")').click();
    await expect(page.locator(".page-title")).toBeVisible();
    await expect(page.locator(".detail-card").first()).toBeVisible();
    await snap(page, "12-ticket-detail.png");
  });

  test("13-users: Capture user administration directory", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/users");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "13-users.png");
  });

  test("14-audit-log: Capture compliance audit trail table", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/audit");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await snap(page, "14-audit-log.png");
  });

  test("15-reports: Capture CSV export reports panel", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/reports");
    await expect(page.locator(".report-card").first()).toBeVisible();
    await snap(page, "15-reports.png");
  });

  test("16-dashboard-employee: Capture employee dashboard view", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/");
    await expect(page.locator("h1.page-title")).toContainText("Dashboard Overview");
    await expect(page.locator(".stat-card").first()).toBeVisible();
    await snap(page, "16-dashboard-employee.png");
  });
});
