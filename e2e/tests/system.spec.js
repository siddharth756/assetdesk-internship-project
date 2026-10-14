// Purpose: Playwright system tests covering ST-01 through ST-16 per Part 9 Step 2 specifications
const { test, expect } = require("@playwright/test");

// Reusable logout helper that ensures clean session termination
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

// Reusable login helper
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

test.describe.serial("AssetDesk System Verification (ST-01..ST-16)", () => {
  let createdTicketCode = "";
  let createdTicketUrl = "";

  test("ST-01 admin login success and dashboard visible", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1.page-title")).toContainText("Dashboard Overview");
    await expect(page.locator(".stat-card-title", { hasText: "Total Hardware Assets" })).toBeVisible();
    await expect(page.locator(".card-title", { hasText: "Assets by Status" })).toBeVisible();
    await expect(page.locator(".card-title", { hasText: "Recent System Audit Trail" })).toBeVisible();
  });

  test("ST-02 wrong password shows error", async ({ page }) => {
    await logout(page);
    await page.fill("#email", "admin@assetdesk.local");
    await page.fill("#password", "IncorrectPassword999");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/login");
    const errorEl = page.locator('[role="alert"], .form-error');
    await expect(errorEl.first()).toBeVisible();
    await expect(errorEl.first()).toContainText(/invalid/i);
  });

  test("ST-03 employee cannot open /users (Not allowed)", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/users");

    // Expect 403 Forbidden screen rendered by ProtectedRoute
    await expect(page.locator(".status-code, h1, .page-title")).toContainText(/403|access forbidden|access denied/i);
  });

  test("ST-04 admin creates an asset", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets/new");

    await page.fill("#name", "Lenovo ThinkPad X1 Carbon Gen 11");
    await page.fill("#serialNumber", "SN-PLAYWRIGHT-TEST-001");
    await page.selectOption("#category", "LAPTOP");
    await page.fill("#notes", "Playwright system test verification device");
    await page.click('button[type="submit"]');

    // Should redirect to detail page
    await expect(page).toHaveURL(/\/assets\/[a-f0-9]{24}/);
    await expect(page.locator("h1.page-title")).toContainText("Lenovo ThinkPad X1 Carbon Gen 11");
    await expect(page.locator(".badge-success", { hasText: "AVAILABLE" }).first()).toBeVisible();
  });

  test("ST-05 duplicate serial shows error", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets/new");
    await page.fill("#name", "Duplicate Serial Laptop");
    await page.fill("#serialNumber", "SN-PLAYWRIGHT-TEST-001"); // Same serial as ST-04
    await page.selectOption("#category", "LAPTOP");
    await page.click('button[type="submit"]');

    // Must show duplicate serial error directly on field or toast
    const errorEl = page.locator("#serialNumber-error, .toast-error");
    await expect(errorEl.first()).toBeVisible();
    await expect(errorEl.first()).toContainText(/serial/i);
  });

  test("ST-06 admin assigns asset to employee", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/assets");
    await page.fill('input[placeholder*="Search"]', "SN-PLAYWRIGHT-TEST-001");
    await page.click('button:has-text("Search")');
    await page.click('a:has-text("View")');

    // Click Assign button
    await page.click('button:has-text("Assign")');
    await expect(page.locator(".modal-dialog")).toBeVisible();

    // Select emp1 (employee)
    const empOption = page.locator('#assignee option', { hasText: 'emp1@assetdesk.local' });
    const empVal = await empOption.getAttribute('value');
    await page.locator('#assignee').selectOption(empVal);
    await page.click('button:has-text("Confirm Assignment")');

    // Verify assignment in UI
    await expect(page.locator(".badge-info", { hasText: "ASSIGNED" }).first()).toBeVisible();
    await expect(page.locator(".detail-card", { hasText: "Assignment Information" })).toContainText("emp1@assetdesk.local");
  });

  test("ST-07 employee sees asset in My Assets", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/my-assets");

    await expect(page.locator("table")).toContainText("SN-PLAYWRIGHT-TEST-001");
    await expect(page.locator("table")).toContainText("Lenovo ThinkPad X1 Carbon Gen 11");
  });

  test("ST-08 employee creates a ticket", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    await page.goto("/tickets/new");

    await page.fill("#title", "External display flickering via USB-C docking station");
    await page.selectOption("#category", "HARDWARE");
    await page.selectOption("#priority", "HIGH");
    await page.fill(
      "#description",
      "Whenever the laptop wakes from sleep while connected to the dock, both external monitors flicker rapidly."
    );
    await page.click('button[type="submit"]');

    // Verify redirect to ticket detail
    await expect(page).toHaveURL(/\/tickets\/[a-f0-9]{24}/);
    await expect(page.locator(".badge-warning", { hasText: "OPEN" }).first()).toBeVisible();
    await expect(page.locator(".badge-warning", { hasText: "HIGH" }).first()).toBeVisible();

    const codeText = await page.locator("h1.page-title").textContent();
    createdTicketCode = codeText.trim();
    createdTicketUrl = page.url();
  });

  test("ST-09 support assigns and resolves the ticket", async ({ page }) => {
    await loginAs(page, "support1@assetdesk.local", "Demo@1234");
    if (createdTicketUrl) {
      await page.goto(createdTicketUrl);
    } else {
      await page.goto("/tickets");
      await page.fill('input[placeholder*="Search"]', createdTicketCode || "flickering");
      await page.click('button:has-text("Search")');
      await page.click('a:has-text("View")');
    }

    // Assign to support1 (select first staff option in dropdown)
    await page.selectOption("#assigneeSelect", { index: 1 });
    await page.click('form button:has-text("Assign")');
    await expect(page.locator(".key-value-item", { hasText: "Assigned Staff" })).not.toContainText("Unassigned");

    // Resolve ticket with resolution note
    await page.selectOption("#statusSelect", "RESOLVED");
    await page.fill(
      "#resNote",
      "Replaced faulty USB-C cable and updated DisplayLink docking firmware to version 1.9."
    );
    await page.click('button:has-text("Update Status")');

    await expect(page.locator(".badge-success", { hasText: "RESOLVED" }).first()).toBeVisible();
    await expect(page.locator(".detail-card", { hasText: "Resolution Notes" })).toContainText("DisplayLink");
  });

  test("ST-10 employee reopens then support closes", async ({ page }) => {
    // 1. Employee reopens ticket
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    if (createdTicketUrl) {
      await page.goto(createdTicketUrl);
    } else {
      await page.goto("/tickets");
      await page.click('a:has-text("View")');
    }

    await expect(page.locator('button:has-text("Reopen Ticket")')).toBeVisible();
    await page.click('button:has-text("Reopen Ticket")');
    await expect(page.locator(".badge-info", { hasText: "IN_PROGRESS" }).first()).toBeVisible();

    // 2. Support resolves and closes ticket
    await loginAs(page, "support1@assetdesk.local", "Demo@1234");
    if (createdTicketUrl) {
      await page.goto(createdTicketUrl);
    } else {
      await page.goto("/tickets");
      await page.click('a:has-text("View")');
    }

    // Must resolve first (IN_PROGRESS -> RESOLVED)
    await page.selectOption("#statusSelect", "RESOLVED");
    await page.fill("#resNote", "Re-verified after customer feedback; issue resolved permanently.");
    await page.click('button:has-text("Update Status")');
    await expect(page.locator(".badge-success", { hasText: "RESOLVED" }).first()).toBeVisible();

    // Then close (RESOLVED -> CLOSED)
    await page.selectOption("#statusSelect", "CLOSED");
    await page.click('button:has-text("Update Status")');
    await expect(page.locator(".badge-neutral", { hasText: "CLOSED" }).first()).toBeVisible();
  });

  test("ST-11 closed ticket cannot receive comments", async ({ page }) => {
    await loginAs(page, "emp1@assetdesk.local", "Demo@1234");
    if (createdTicketUrl) {
      await page.goto(createdTicketUrl);
    } else {
      await page.goto("/tickets");
      await page.click('a:has-text("View")');
    }

    await expect(page.locator(".badge-neutral", { hasText: "CLOSED" }).first()).toBeVisible();

    // Verify comment input is not present when ticket is closed
    await expect(page.locator("#commentText")).toHaveCount(0);
  });

  test("ST-12 license allocate until seats full, then error", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/licenses/new");

    await page.fill("#softwareName", "Figma Enterprise License");
    await page.fill("#vendor", "Figma Inc");
    await page.fill("#licenseKey", "FIGMA-CORP-99281");
    await page.fill("#totalSeats", "1"); // Only 1 seat
    await page.fill("#expiryDate", "2027-12-31");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/licenses\/[a-f0-9]{24}/);

    // Allocate the only seat
    await page.click('button:has-text("Allocate Seat")');
    await expect(page.locator(".modal-dialog")).toBeVisible();
    await page.selectOption("#seatUser", { index: 1 });
    await page.click('button:has-text("Confirm Allocation")');

    // Verify seat is allocated (1 / 1 used)
    await expect(page.locator(".detail-card", { hasText: "Seat Utilization" })).toContainText("1");
    // Allocate button should be disabled when full
    await expect(page.locator('button:has-text("Allocate Seat")')).toBeDisabled();
  });

  test("ST-13 expiring licenses visible with badges", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/licenses");
    await page.selectOption("select", "EXPIRING");
    await page.click('button:has-text("Search")');

    // Check table rows contain EXPIRING badge
    const badge = page.locator(".badge-warning", { hasText: "EXPIRING" });
    await expect(badge.first()).toBeVisible();
  });

  test("ST-14 admin downloads assets CSV and file has header row", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/reports");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('.report-card:has-text("Hardware Assets") button').click()
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const csvContent = Buffer.concat(chunks).toString("utf8");

    // Verify RFC-4180 header row presence
    expect(csvContent).toMatch(/Asset Tag/i);
    expect(csvContent).toMatch(/Serial Number/i);
    expect(csvContent).toMatch(/Category/i);
  });

  test("ST-15 audit log shows the actions performed in ST-04..ST-10", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    await page.goto("/audit");
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    const entitySelect = page.locator("select").first();

    // Filter by entity ASSET to view asset operations
    await entitySelect.selectOption("ASSET");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    const assetTableText = await page.locator("table").textContent();
    expect(assetTableText).toContain("ASSET_CREATE");
    expect(assetTableText).toContain("ASSET_ASSIGN");

    // Filter by entity TICKET to view ticket operations
    await entitySelect.selectOption("TICKET");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    const ticketTableText = await page.locator("table").textContent();
    expect(ticketTableText).toContain("TICKET_CREATE");
    expect(ticketTableText).toContain("TICKET_STATUS");
  });

  test("ST-16 logout clears session", async ({ page }) => {
    await loginAs(page, "admin@assetdesk.local", "Demo@1234");
    const logoutBtn = page.locator('button[aria-label="Log out of application"], button:has-text("Logout")');
    await logoutBtn.click();
    await expect(page).toHaveURL("/login");

    // Attempt direct navigation to protected route
    await page.goto("/assets");
    await expect(page).toHaveURL("/login");
  });
});
