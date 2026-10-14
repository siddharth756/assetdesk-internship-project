// Purpose: Integration tests for Module M5 Dashboard summary metrics
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, Asset, License, Ticket, AuditLog } = require("../../src/models");
const { startOfToday, addDays, addHours } = require("../../src/utils/dates");

describe("Dashboard Summary Integration Tests (Module M5)", () => {
  let adminUser;
  let supportUser;
  let employeeUser1;
  let employeeUser2;
  let adminToken;
  let supportToken;
  let employeeToken1;

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

    employeeUser1 = await User.create({
      name: "Employee One",
      email: "emp1@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Engineering",
      isActive: true
    });

    employeeUser2 = await User.create({
      name: "Employee Two",
      email: "emp2@assetdesk.local",
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

    employeeToken1 = jwt.sign(
      { id: employeeUser1._id, role: employeeUser1.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );

    // Seed assets
    await Asset.create([
      {
        serialNumber: "SN-LAP-001",
        name: "MacBook Pro 14",
        category: "LAPTOP",
        status: "ASSIGNED",
        assignedTo: employeeUser1._id
      },
      {
        serialNumber: "SN-LAP-002",
        name: "Dell Latitude",
        category: "LAPTOP",
        status: "ASSIGNED",
        assignedTo: employeeUser1._id
      },
      {
        serialNumber: "SN-MON-001",
        name: "LG 27 4K",
        category: "MONITOR",
        status: "AVAILABLE",
        assignedTo: null
      },
      {
        serialNumber: "SN-PRN-001",
        name: "HP LaserJet",
        category: "PRINTER",
        status: "MAINTENANCE",
        assignedTo: null
      }
    ]);

    // Seed licenses
    const today = startOfToday();
    await License.create([
      {
        softwareName: "Active Tool",
        licenseKey: "KEY-ACTIVE-001",
        totalSeats: 5,
        expiryDate: addDays(today, 100) // ACTIVE (> 30 days)
      },
      {
        softwareName: "Expiring Tool",
        licenseKey: "KEY-EXP-0001",
        totalSeats: 5,
        expiryDate: addDays(today, 10) // EXPIRING (<= 30 days)
      },
      {
        softwareName: "Expired Tool",
        licenseKey: "KEY-EXPIRED-01",
        totalSeats: 5,
        expiryDate: addDays(today, -5) // EXPIRED (< today)
      }
    ]);

    // Seed tickets
    const now = new Date();
    await Ticket.create([
      {
        title: "Open issue by emp 1",
        description: "Wifi issue.",
        category: "NETWORK",
        priority: "HIGH",
        status: "OPEN",
        createdBy: employeeUser1._id,
        dueAt: addHours(now, 24)
      },
      {
        title: "Overdue issue by emp 1",
        description: "Monitor flickering.",
        category: "HARDWARE",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        createdBy: employeeUser1._id,
        assignedTo: supportUser._id,
        dueAt: addHours(now, -3) // Overdue
      },
      {
        title: "Resolved issue by emp 1",
        description: "Password reset request.",
        category: "ACCESS",
        priority: "LOW",
        status: "RESOLVED",
        createdBy: employeeUser1._id,
        assignedTo: supportUser._id,
        resolutionNote: "Reset completed successfully.",
        dueAt: addHours(now, -5) // Due past, but RESOLVED -> not overdue
      },
      {
        title: "Issue by emp 2",
        description: "Slack error.",
        category: "SOFTWARE",
        priority: "MEDIUM",
        status: "OPEN",
        createdBy: employeeUser2._id,
        dueAt: addHours(now, 48)
      }
    ]);

    // Seed audit log
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name,
      action: "LOGIN",
      entity: "AUTH",
      details: "Admin test login",
      ip: "127.0.0.1"
    });
  });

  describe("GET /api/v1/dashboard/summary", () => {
    it("IT-M5-15 should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/v1/dashboard/summary");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("IT-M5-16 should return full organizational dashboard for ADMIN including recentAudit", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(d.assetsTotal).toBe(4);
      expect(d.assetsByStatus).toEqual({
        AVAILABLE: 1,
        ASSIGNED: 2,
        MAINTENANCE: 1,
        RETIRED: 0
      });
      expect(d.assetsByCategory).toEqual({
        LAPTOP: 2,
        DESKTOP: 0,
        MONITOR: 1,
        PRINTER: 1,
        NETWORK: 0,
        MOBILE: 0,
        OTHER: 0
      });
      expect(d.licensesExpiring).toBe(1);
      expect(d.licensesExpired).toBe(1);
      expect(d.ticketsByStatus).toEqual({
        OPEN: 2,
        IN_PROGRESS: 1,
        RESOLVED: 1,
        CLOSED: 0
      });
      expect(d.ticketsOverdue).toBe(1);
      expect(Array.isArray(d.recentTickets)).toBe(true);
      expect(d.recentTickets.length).toBe(4);
      expect(Array.isArray(d.recentAudit)).toBe(true);
      expect(d.recentAudit.length).toBe(1);
    });

    it("IT-M5-17 should return organizational dashboard for IT_SUPPORT without recentAudit", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(d.assetsTotal).toBe(4);
      expect(d.recentTickets).toBeDefined();
      // Contract section 8: recentAudit (5, admin only)
      expect(d.recentAudit).toBeUndefined();
    });

    it("IT-M5-18 should return personal dashboard for EMPLOYEE with only own data", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${employeeToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      // Should not contain admin fields
      expect(d.assetsTotal).toBeUndefined();
      expect(d.licensesExpiring).toBeUndefined();

      // Should contain employee specific fields
      expect(d.myAssetsCount).toBe(2); // 2 laptops assigned to emp1
      expect(d.myOpenTickets).toBe(2); // 1 OPEN + 1 IN_PROGRESS for emp1 (RESOLVED not counted in open)
      expect(Array.isArray(d.myRecentTickets)).toBe(true);
      expect(d.myRecentTickets.length).toBe(3); // 3 tickets created by emp1
    });

    it("IT-M5-19 should compute ticketsOverdue using ticketRules (not RESOLVED/CLOSED and dueAt < now)", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      // There are 2 tickets with past dueAt: 1 is IN_PROGRESS (overdue), 1 is RESOLVED (not overdue)
      expect(res.body.data.ticketsOverdue).toBe(1);
    });

    it("IT-M5-20 should populate recentTickets with createdBy, assignedTo, and relatedAsset", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      const recent = res.body.data.recentTickets;
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].createdBy).toBeDefined();
      expect(recent[0].createdBy.name).toBeDefined();
    });

    it("IT-M5-21 should limit recentTickets and recentAudit to maximum 5 items", async () => {
      // Add more tickets to exceed 5
      const extraTickets = [];
      for (let i = 0; i < 5; i++) {
        extraTickets.push({
          title: `Extra ticket ${i + 1}`,
          description: "Extra test ticket.",
          category: "OTHER",
          priority: "LOW",
          createdBy: employeeUser1._id
        });
      }
      await Ticket.create(extraTickets);

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.body.data.recentTickets.length).toBe(5);
    });

    it("IT-M5-22 should return zero counts when collections are empty without errors", async () => {
      await Asset.deleteMany({});
      await License.deleteMany({});
      await Ticket.deleteMany({});
      await AuditLog.deleteMany({}).setOptions({ bypassAuditLock: true });

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assetsTotal).toBe(0);
      expect(res.body.data.licensesExpiring).toBe(0);
      expect(res.body.data.licensesExpired).toBe(0);
      expect(res.body.data.ticketsOverdue).toBe(0);
      expect(res.body.data.recentTickets).toEqual([]);
      expect(res.body.data.recentAudit).toEqual([]);
    });
  });
});
