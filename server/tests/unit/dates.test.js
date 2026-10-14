// Purpose: Unit tests for dates utility functions and license expiry check job
const { startOfToday, daysBetween, addDays, addHours } = require("../../src/utils/dates");
const { runLicenseExpiryCheck } = require("../../src/jobs/licenseExpiryJob");
const { License, User, AuditLog } = require("../../src/models");
const mailService = require("../../src/services/mailService");

describe("Dates Utility Unit Tests", () => {
  it("startOfToday should return a date with zeroed hours, minutes, seconds, ms", () => {
    const today = startOfToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });

  it("daysBetween should calculate difference in calendar days", () => {
    const d1 = new Date("2026-01-01T10:00:00Z");
    const d2 = new Date("2026-01-11T15:00:00Z");
    expect(daysBetween(d1, d2)).toBe(10);
  });

  it("addDays should accurately add days to date", () => {
    const start = new Date("2026-05-01T00:00:00.000Z");
    const result = addDays(start, 5);
    expect(result.getDate()).toBe(6);
  });

  it("addHours should accurately add hours to date", () => {
    const start = new Date("2026-05-01T10:00:00.000Z");
    const result = addHours(start, 4);
    expect(result.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000);
  });
});

describe("License Expiry Alert Job Unit Tests (runLicenseExpiryCheck)", () => {
  let adminUser;
  let sendMailSpy;

  beforeEach(async () => {
    await License.deleteMany({});
    await User.deleteMany({});
    await AuditLog.deleteMany({}).setOptions({ bypassAuditLock: true });

    sendMailSpy = jest.spyOn(mailService, "sendMail").mockResolvedValue({
      success: true,
      simulated: true
    });

    adminUser = await User.create({
      name: "Admin User",
      email: "admin@assetdesk.local",
      passwordHash: "dummyHash",
      role: "ADMIN",
      isActive: true
    });

    // Inactive admin should not receive email alerts
    await User.create({
      name: "Inactive Admin",
      email: "inactive_admin@assetdesk.local",
      passwordHash: "dummyHash",
      role: "ADMIN",
      isActive: false
    });

    // Employee should not receive license expiry alerts
    await User.create({
      name: "Employee User",
      email: "emp@assetdesk.local",
      passwordHash: "dummyHash",
      role: "EMPLOYEE",
      isActive: true
    });
  });

  afterEach(() => {
    if (sendMailSpy) {
      sendMailSpy.mockRestore();
    }
  });

  it("triggers alerts for licenses with injected dates at exactly 30, 15, 7, and 0 days", async () => {
    const today = new Date("2026-06-01T00:00:00.000Z");

    await License.create({
      softwareName: "Lic 30 Days",
      licenseKey: "KEY-30-DAYS",
      totalSeats: 5,
      expiryDate: addDays(today, 30)
    });

    await License.create({
      softwareName: "Lic 15 Days",
      licenseKey: "KEY-15-DAYS",
      totalSeats: 5,
      expiryDate: addDays(today, 15)
    });

    await License.create({
      softwareName: "Lic 7 Days",
      licenseKey: "KEY-7-DAYS",
      totalSeats: 5,
      expiryDate: addDays(today, 7)
    });

    await License.create({
      softwareName: "Lic Today",
      licenseKey: "KEY-0-DAYS",
      totalSeats: 5,
      expiryDate: today
    });


    // Non-alerting license (e.g. 20 days left)
    await License.create({
      softwareName: "Lic 20 Days",
      licenseKey: "KEY-20-DAYS",
      totalSeats: 5,
      expiryDate: addDays(today, 20)
    });

    const alerts = await runLicenseExpiryCheck(today);

    expect(alerts.length).toBe(4);
    const alertedNames = alerts.map((a) => a.softwareName);
    expect(alertedNames).toContain("Lic 30 Days");
    expect(alertedNames).toContain("Lic 15 Days");
    expect(alertedNames).toContain("Lic 7 Days");
    expect(alertedNames).toContain("Lic Today");
    expect(alertedNames).not.toContain("Lic 20 Days");

    // Verify mailService was called only for active admins
    expect(sendMailSpy).toHaveBeenCalled();
    sendMailSpy.mock.calls.forEach((call) => {
      expect(call[0].to).toEqual([adminUser.email]);
      expect(call[0].to).not.toContain("inactive_admin@assetdesk.local");
      expect(call[0].to).not.toContain("emp@assetdesk.local");
    });

    // Verify AuditLog entries
    const logs = await AuditLog.find({ action: "LICENSE_EXPIRY_ALERT" });
    expect(logs.length).toBe(4);
    const logDetails = logs.map((l) => l.details);
    expect(logDetails.some((d) => d.includes("expires in 30 days"))).toBe(true);
    expect(logDetails.some((d) => d.includes("expires in 15 days"))).toBe(true);
    expect(logDetails.some((d) => d.includes("expires in 7 days"))).toBe(true);
    expect(logDetails.some((d) => d.includes("expired today"))).toBe(true);
  });

  it("triggers alert when daysLeft <= 0 (already expired)", async () => {
    const today = new Date("2026-06-01T00:00:00.000Z");

    await License.create({
      softwareName: "Expired 10 Days Ago",
      licenseKey: "KEY-EXPIRED",
      totalSeats: 2,
      expiryDate: addDays(today, -10)
    });

    const alerts = await runLicenseExpiryCheck(today);
    expect(alerts.length).toBe(1);
    expect(alerts[0].softwareName).toBe("Expired 10 Days Ago");
    expect(alerts[0].daysLeft).toBe(-10);

    const log = await AuditLog.findOne({ action: "LICENSE_EXPIRY_ALERT" });
    expect(log).not.toBeNull();
    expect(log.details).toContain("expired (10 days ago)");
  });

  it("does not create duplicate alert twice on the same day for the same license", async () => {
    const today = new Date("2026-06-01T00:00:00.000Z");

    await License.create({
      softwareName: "Duplicate Test Lic",
      licenseKey: "KEY-DUP-TEST",
      totalSeats: 5,
      expiryDate: addDays(today, 15)
    });

    // First check run
    const firstAlerts = await runLicenseExpiryCheck(today);
    expect(firstAlerts.length).toBe(1);
    expect(sendMailSpy).toHaveBeenCalledTimes(1);

    // Second check run on the same day
    const secondAlerts = await runLicenseExpiryCheck(today);
    expect(secondAlerts.length).toBe(0);
    expect(sendMailSpy).toHaveBeenCalledTimes(1); // not called again

    const logs = await AuditLog.find({ action: "LICENSE_EXPIRY_ALERT" });
    expect(logs.length).toBe(1);
  });
});
