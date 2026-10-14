// Purpose: Integration tests for Module M5 Audit Logs API
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, AuditLog } = require("../../src/models");

describe("Audit Log Integration Tests (Module M5)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let adminToken;
  let supportToken;
  let employeeToken;

  beforeEach(async () => {
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

    // Seed sample audit logs
    const now = Date.now();
    await AuditLog.create([
      {
        user: adminUser._id,
        userName: adminUser.name,
        action: "LOGIN",
        entity: "AUTH",
        entityId: adminUser._id.toString(),
        details: "Successful admin login",
        ip: "127.0.0.1",
        createdAt: new Date(now - 10000)
      },
      {
        user: adminUser._id,
        userName: adminUser.name,
        action: "USER_CREATE",
        entity: "USER",
        entityId: employeeUser._id.toString(),
        details: `Created user ${employeeUser.email}`,
        ip: "127.0.0.1",
        createdAt: new Date(now - 8000)
      },
      {
        user: supportUser._id,
        userName: supportUser.name,
        action: "TICKET_ASSIGN",
        entity: "TICKET",
        entityId: "TCK-2026-0001",
        details: "Assigned ticket TCK-2026-0001 to Support User",
        ip: "127.0.0.1",
        createdAt: new Date(now - 5000)
      },
      {
        user: employeeUser._id,
        userName: employeeUser.name,
        action: "TICKET_CREATE",
        entity: "TICKET",
        entityId: "TCK-2026-0002",
        details: "Created ticket TCK-2026-0002",
        ip: "127.0.0.1",
        createdAt: new Date(now - 2000)
      }
    ]);
  });

  describe("Access Control & Authorization", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/v1/audit-logs");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject employee request with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject IT_SUPPORT request with 403 Forbidden (ADMIN only)", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow ADMIN to list all audit logs with populated user", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);
      expect(res.body.meta.total).toBe(4);
      expect(res.body.data[0].user).toBeDefined();
      expect(res.body.data[0].user.email).toBeDefined();
    });
  });

  describe("Filtering and Sorting", () => {
    it("should filter audit logs by action", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs?action=LOGIN")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe("LOGIN");
    });

    it("should filter audit logs by entity", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs?entity=TICKET")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach((log) => {
        expect(log.entity).toBe("TICKET");
      });
    });

    it("should filter audit logs by user ID", async () => {
      const res = await request(app)
        .get(`/api/v1/audit-logs?user=${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].userName).toBe(employeeUser.name);
    });

    it("should filter audit logs by date range (from and to)", async () => {
      const pastFrom = new Date(Date.now() - 6000).toISOString();
      const res = await request(app)
        .get(`/api/v1/audit-logs?from=${pastFrom}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("should paginate results with meta and limit", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 4
      });
    });

    it("should sort newest logs first by default (-createdAt)", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const timestamps = res.body.data.map((l) => new Date(l.createdAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe("Append-Only Proof (No Edit/Delete Routes)", () => {
    it("should return 404 for PUT /api/v1/audit-logs", async () => {
      const res = await request(app)
        .put("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ details: "Tampered" });

      expect(res.status).toBe(404);
    });

    it("should return 404 for DELETE /api/v1/audit-logs", async () => {
      const res = await request(app)
        .delete("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 404 for PUT /api/v1/audit-logs/:id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/audit-logs/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ details: "Tampered" });

      expect(res.status).toBe(404);
    });

    it("should return 404 for DELETE /api/v1/audit-logs/:id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/audit-logs/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
