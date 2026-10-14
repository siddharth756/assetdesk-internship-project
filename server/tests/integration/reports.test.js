// Purpose: Integration tests for Module M5 CSV Reports API
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, Asset, License, Ticket, AuditLog } = require("../../src/models");
const { startOfToday, addDays } = require("../../src/utils/dates");

describe("CSV Reports Integration Tests (Module M5)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let adminToken;
  let supportToken;
  let employeeToken;

  beforeEach(async () => {
    await Asset.deleteMany({});
    await License.deleteMany({});
    await Ticket.deleteMany({});
    await User.deleteMany({});
    await AuditLog.deleteMany({}).setOptions({ bypassAuditLock: true });

    const passwordHash = await bcrypt.hash("Password123", 10);

    adminUser = await User.create({
      name: "Admin User",
      email: "admin@assetdesk.local",
      passwordHash,
      role: "ADMIN",
      department: "IT",
      isActive: true
    });

    supportUser = await User.create({
      name: "Support User",
      email: "support@assetdesk.local",
      passwordHash,
      role: "IT_SUPPORT",
      department: "IT Support",
      isActive: true
    });

    employeeUser = await User.create({
      name: "Employee User",
      email: "employee@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Design",
      isActive: true
    });

    adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );

    supportToken = jwt.sign(
      { id: supportUser._id, role: supportUser.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );

    employeeToken = jwt.sign(
      { id: employeeUser._id, role: employeeUser.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );

    // Seed test data with potential CSV injection strings
    await Asset.create({
      serialNumber: "SN-LAP-101",
      name: "=SUM(1+2)",
      category: "LAPTOP",
      status: "AVAILABLE",
      notes: "Testing formula prefix"
    });

    await License.create({
      softwareName: "Photoshop CC",
      vendor: "Adobe Inc.",
      licenseKey: "ADOBE-SEC-KEY-9999",
      totalSeats: 5,
      expiryDate: addDays(startOfToday(), 60),
      notes: "Design department license"
    });

    await Ticket.create({
      title: "Printer roller slip",
      description: "Needs roller cleaning.",
      category: "HARDWARE",
      priority: "MEDIUM",
      status: "OPEN",
      createdBy: employeeUser._id
    });

    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name,
      action: "LOGIN",
      entity: "AUTH",
      details: "Admin test login",
      ip: "127.0.0.1"
    });
  });

  describe("Access Control & Permissions", () => {
    it("should reject unauthenticated requests for all report endpoints with 401", async () => {
      const endpoints = [
        "/api/v1/reports/assets",
        "/api/v1/reports/licenses",
        "/api/v1/reports/tickets",
        "/api/v1/reports/audit"
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
      }
    });

    it("should reject employee requests with 403 Forbidden on all reports", async () => {
      const endpoints = [
        "/api/v1/reports/assets",
        "/api/v1/reports/licenses",
        "/api/v1/reports/tickets",
        "/api/v1/reports/audit"
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${employeeToken}`);
        expect(res.status).toBe(403);
      }
    });

    it("should allow IT_SUPPORT to export assets, licenses, and tickets", async () => {
      const endpoints = [
        "/api/v1/reports/assets",
        "/api/v1/reports/licenses",
        "/api/v1/reports/tickets"
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${supportToken}`);
        expect(res.status).toBe(200);
      }
    });

    it("should reject IT_SUPPORT on audit report (ADMIN only)", async () => {
      const res = await request(app)
        .get("/api/v1/reports/audit")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Response Headers and CSV Content", () => {
    const todayStr = new Date().toISOString().split("T")[0];

    it("should set text/csv content-type and attachment filename on assets report", async () => {
      const res = await request(app)
        .get("/api/v1/reports/assets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toBe(
        `attachment; filename="assets-${todayStr}.csv"`
      );
    });

    it("assets report should include expected header row and data rows", async () => {
      const res = await request(app)
        .get("/api/v1/reports/assets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain(
        "Asset Tag,Asset Name,Category,Status,Serial Number,Assigned To,Assigned Email,Purchase Date,Warranty Expiry,Notes\r\n"
      );
      expect(res.text).toContain("SN-LAP-101");
    });

    it("licenses report should mask license key in CSV export (****-****-XXXX)", async () => {
      const res = await request(app)
        .get("/api/v1/reports/licenses")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("****-****-9999");
      expect(res.text).not.toContain("ADOBE-SEC-KEY-9999");
    });

    it("should apply formula injection mitigation for cells starting with '='", async () => {
      const res = await request(app)
        .get("/api/v1/reports/assets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      // Asset name "=SUM(1+2)" must be prefixed with '
      expect(res.text).toContain("'=SUM(1+2)");
    });

    it("tickets report should include ticket headers and row data", async () => {
      const res = await request(app)
        .get("/api/v1/reports/tickets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain(
        "Ticket Code,Title,Category,Priority,Status,Created By,Created Email,Assigned To,Related Asset,Due At,Resolved At,Closed At,Resolution Note,Created At\r\n"
      );
      expect(res.text).toContain("Printer roller slip");
      expect(res.text).toContain("HARDWARE");
      expect(res.text).toContain("Employee User");
    });

    it("admin can export audit logs report as CSV", async () => {
      const res = await request(app)
        .get("/api/v1/reports/audit")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toBe(
        `attachment; filename="audit-${todayStr}.csv"`
      );
      expect(res.text).toContain(
        "Timestamp,User Name,Action,Entity,Entity ID,Details,IP Address\r\n"
      );
      expect(res.text).toContain("Admin User");
      expect(res.text).toContain("LOGIN");
    });

    it("should write REPORT_EXPORT audit log for each exported report", async () => {
      await request(app)
        .get("/api/v1/reports/tickets")
        .set("Authorization", `Bearer ${supportToken}`);

      const audit = await AuditLog.findOne({
        action: "REPORT_EXPORT",
        entity: "TICKET"
      });
      expect(audit).toBeDefined();
      expect(audit.details).toContain("Exported tickets report");
    });

    it("should respect simple query filters on report endpoints", async () => {
      // Filter assets by category=MONITOR (no monitor in db)
      const res = await request(app)
        .get("/api/v1/reports/assets?category=MONITOR")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      // Should have header row only
      const lines = res.text.trim().split("\r\n");
      expect(lines.length).toBe(1);
    });
  });
});
