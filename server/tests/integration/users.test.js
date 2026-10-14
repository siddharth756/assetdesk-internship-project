// Purpose: Integration tests for Module M1 User Management endpoints
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, AuditLog } = require("../../src/models");

describe("Users Integration Tests (Module M1)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let adminToken;
  let supportToken;
  let employeeToken;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    adminUser = await User.create({
      name: "Admin Person",
      email: "admin@assetdesk.local",
      passwordHash,
      role: "ADMIN",
      department: "IT",
      isActive: true
    });

    supportUser = await User.create({
      name: "Support Person",
      email: "support@assetdesk.local",
      passwordHash,
      role: "IT_SUPPORT",
      department: "Helpdesk",
      isActive: true
    });

    employeeUser = await User.create({
      name: "Employee Person",
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
  });

  describe("GET /api/v1/users (RBAC & Listing)", () => {
    it("1. EMPLOYEE blocked from /users: should return 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("2. IT_SUPPORT blocked from /users: should return 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("3. ADMIN can list users with pagination and search", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3
      });

      // Search by name
      const searchRes = await request(app)
        .get("/api/v1/users?search=support")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].email).toBe("support@assetdesk.local");
    });
  });

  describe("POST /api/v1/users (Creation)", () => {
    it("4. ADMIN create user ok: should create user and return 201 with user data", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Alice Developer",
          email: "alice.dev@assetdesk.local",
          password: "SecurePass2026",
          role: "EMPLOYEE",
          department: "Engineering"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Alice Developer");
      expect(res.body.data.email).toBe("alice.dev@assetdesk.local");
      expect(res.body.data.role).toBe("EMPLOYEE");
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("5. duplicate email: should reject with 409 CONFLICT", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate User",
          email: "admin@assetdesk.local",
          password: "SecurePass2026",
          role: "EMPLOYEE"
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("6. weak password: should reject with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Weak Pass User",
          email: "weakpass@assetdesk.local",
          password: "weak",
          role: "EMPLOYEE"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("7. audit row created for user create", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Bob Builder",
          email: "bob.builder@assetdesk.local",
          password: "SecurePass2026",
          role: "EMPLOYEE"
        });

      const createdUserId = res.body.data._id;
      const audit = await AuditLog.findOne({
        action: "USER_CREATE",
        entity: "USER",
        entityId: createdUserId
      });

      expect(audit).not.toBeNull();
      expect(audit.userName).toBe(adminUser.name);
      expect(audit.details).toContain("bob.builder@assetdesk.local");
    });
  });

  describe("PUT /api/v1/users/:id (Update)", () => {
    it("8. ADMIN update user: should update name, department, role", async () => {
      const res = await request(app)
        .put(`/api/v1/users/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Employee Updated",
          department: "Product",
          role: "IT_SUPPORT"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Employee Updated");
      expect(res.body.data.department).toBe("Product");
      expect(res.body.data.role).toBe("IT_SUPPORT");

      const audit = await AuditLog.findOne({
        action: "USER_UPDATE",
        entity: "USER",
        entityId: employeeUser._id.toString()
      });
      expect(audit).not.toBeNull();
    });

    it("9. admin cannot demote self: should reject self-demotion with 400", async () => {
      const res = await request(app)
        .put(`/api/v1/users/${adminUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          role: "EMPLOYEE"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/cannot demote/i);
    });
  });

  describe("PATCH /api/v1/users/:id/status (Toggle Status)", () => {
    it("10. admin cannot deactivate self: should reject self-deactivation with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/cannot deactivate/i);
    });

    it("11. ADMIN can toggle another user status", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${employeeUser._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      const audit = await AuditLog.findOne({
        action: "USER_STATUS",
        entity: "USER",
        entityId: employeeUser._id.toString()
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("GET /api/v1/users/lookup (Dropdown Lookup)", () => {
    it("12. lookup allowed for IT_SUPPORT", async () => {
      const res = await request(app)
        .get("/api/v1/users/lookup")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Only active users returned with specific fields
      expect(res.body.data.length).toBe(3);
      const first = res.body.data[0];
      expect(first).toHaveProperty("_id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("email");
      expect(first).toHaveProperty("role");
      expect(first).toHaveProperty("department");
      expect(first.passwordHash).toBeUndefined();
    });

    it("13. lookup allowed for ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/users/lookup")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("14. lookup forbidden for EMPLOYEE: should return 403", async () => {
      const res = await request(app)
        .get("/api/v1/users/lookup")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Security Guarantee: passwordHash leak prevention", () => {
    it("15. password hash never in any response", async () => {
      // 1. List users
      const listRes = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);
      listRes.body.data.forEach((u) => {
        expect(u.passwordHash).toBeUndefined();
      });

      // 2. Get single user
      const singleRes = await request(app)
        .get(`/api/v1/users/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(singleRes.body.data.passwordHash).toBeUndefined();

      // 3. Update user
      const updateRes = await request(app)
        .put(`/api/v1/users/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ department: "Security" });
      expect(updateRes.body.data.passwordHash).toBeUndefined();

      // 4. Update status
      const statusRes = await request(app)
        .patch(`/api/v1/users/${employeeUser._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });
      expect(statusRes.body.data.passwordHash).toBeUndefined();
    });
  });
});
