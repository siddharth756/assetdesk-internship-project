// Purpose: Integration tests for Module M2 Hardware Assets endpoints
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { Asset, User, AuditLog, Counter } = require("../../src/models");

describe("Hardware Assets Integration Tests (Module M2)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let employeeUser2;
  let inactiveUser;
  let adminToken;
  let supportToken;
  let employeeToken;

  beforeEach(async () => {
    // Reset Counter and collections before each test run
    await Counter.deleteMany({});
    await Asset.deleteMany({});
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

    employeeUser2 = await User.create({
      name: "Employee Two",
      email: "employee2@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Marketing",
      isActive: true
    });

    inactiveUser = await User.create({
      name: "Inactive User",
      email: "inactive@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Finance",
      isActive: false
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

  describe("POST /api/v1/assets (Creation)", () => {
    it("IT-M2-01 allows ADMIN to create an asset with auto-generated assetTag and default AVAILABLE status", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "SN-DELL-1001",
          name: "Dell Latitude 5520",
          category: "LAPTOP",
          purchaseDate: "2026-01-15T00:00:00.000Z",
          warrantyExpiry: "2029-01-15T00:00:00.000Z",
          notes: "Brand new developer laptop"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Dell Latitude 5520");
      expect(res.body.data.serialNumber).toBe("SN-DELL-1001");
      expect(res.body.data.status).toBe("AVAILABLE");
      expect(res.body.data.assignedTo).toBeNull();
      const currentYear = new Date().getFullYear();
      expect(res.body.data.assetTag).toBe(`AST-${currentYear}-0001`);
    });

    it("IT-M2-02 allows IT_SUPPORT to create an asset", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${supportToken}`)
        .send({
          serialNumber: "SN-HP-2001",
          name: "HP LaserJet Pro M404n",
          category: "PRINTER"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe("PRINTER");
    });

    it("IT-M2-03 auto-generates sequential assetTags (AST-YEAR-0001, AST-YEAR-0002)", async () => {
      const res1 = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "SN-SEQ-001",
          name: "Device One",
          category: "MONITOR"
        });

      const res2 = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "SN-SEQ-002",
          name: "Device Two",
          category: "MONITOR"
        });

      const currentYear = new Date().getFullYear();
      expect(res1.body.data.assetTag).toBe(`AST-${currentYear}-0001`);
      expect(res2.body.data.assetTag).toBe(`AST-${currentYear}-0002`);
    });

    it("IT-M2-04 rejects duplicate serialNumber with 409 and exact message 'Serial number already registered'", async () => {
      await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "DUPLICATE-SN",
          name: "Initial Asset",
          category: "DESKTOP"
        });

      const duplicateRes = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "DUPLICATE-SN",
          name: "Second Asset",
          category: "DESKTOP"
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe("CONFLICT");
      expect(duplicateRes.body.error.message).toBe("Serial number already registered");
    });

    it("IT-M2-05 rejects missing required fields with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          notes: "Missing serialNumber, name, and category"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M2-06 rejects invalid category enum with 400", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "SN-INVALID-CAT",
          name: "Invalid Category Asset",
          category: "REFRIGERATOR"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("IT-M2-07 forbids EMPLOYEE role from creating an asset (403)", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          serialNumber: "SN-EMP-FORBIDDEN",
          name: "Employee Machine",
          category: "LAPTOP"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("IT-M2-08 rejects unauthenticated creation request with 401", async () => {
      const res = await request(app)
        .post("/api/v1/assets")
        .send({
          serialNumber: "SN-NOAUTH",
          name: "Unauthenticated Machine",
          category: "LAPTOP"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/v1/assets (Listing & Query filters)", () => {
    beforeEach(async () => {
      await Asset.create([
        {
          serialNumber: "SR-SRCH-100",
          name: "Dell XPS 15",
          category: "LAPTOP",
          status: "AVAILABLE",
          assignedTo: null
        },
        {
          serialNumber: "SR-SRCH-200",
          name: "MacBook Pro M3",
          category: "LAPTOP",
          status: "ASSIGNED",
          assignedTo: employeeUser._id
        },
        {
          serialNumber: "SR-SRCH-300",
          name: "Dell UltraSharp 27",
          category: "MONITOR",
          status: "MAINTENANCE",
          assignedTo: null
        },
        {
          serialNumber: "SR-SRCH-400",
          name: "Cisco Catalyst 2960",
          category: "NETWORK",
          status: "RETIRED",
          assignedTo: null
        }
      ]);
    });

    it("IT-M2-09 lists assets with pagination metadata for ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/assets?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 4
      });
    });

    it("IT-M2-10 supports search query q across name, serialNumber, and assetTag", async () => {
      const res = await request(app)
        .get("/api/v1/assets?q=MacBook")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("MacBook Pro M3");
    });

    it("IT-M2-11 escapes regex special characters in search query q safely", async () => {
      const res = await request(app)
        .get("/api/v1/assets?q=Dell+*?^$()")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it("IT-M2-12 filters assets by category", async () => {
      const res = await request(app)
        .get("/api/v1/assets?category=MONITOR")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe("MONITOR");
    });

    it("IT-M2-13 filters assets by status", async () => {
      const res = await request(app)
        .get("/api/v1/assets?status=MAINTENANCE")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe("MAINTENANCE");
    });

    it("IT-M2-14 filters assets by assigned status (yes / no)", async () => {
      const resYes = await request(app)
        .get("/api/v1/assets?assigned=yes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resYes.status).toBe(200);
      expect(resYes.body.data.length).toBe(1);
      expect(resYes.body.data[0].name).toBe("MacBook Pro M3");
      expect(resYes.body.data[0].assignedTo.email).toBe(employeeUser.email);

      const resNo = await request(app)
        .get("/api/v1/assets?assigned=no")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resNo.status).toBe(200);
      expect(resNo.body.data.length).toBe(3);
    });

    it("IT-M2-15 supports sorting by name ascending", async () => {
      const res = await request(app)
        .get("/api/v1/assets?sort=name")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe("Cisco Catalyst 2960");
    });

    it("IT-M2-16 forbids EMPLOYEE role from listing assets (403)", async () => {
      const res = await request(app)
        .get("/api/v1/assets")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /api/v1/assets/mine", () => {
    it("IT-M2-17 returns only assets assigned to the authenticated user", async () => {
      await Asset.create([
        {
          serialNumber: "EMP-AST-1",
          name: "Employee Own Laptop",
          category: "LAPTOP",
          status: "ASSIGNED",
          assignedTo: employeeUser._id
        },
        {
          serialNumber: "OTHER-AST-2",
          name: "Other Laptop",
          category: "LAPTOP",
          status: "ASSIGNED",
          assignedTo: employeeUser2._id
        },
        {
          serialNumber: "UNASSIGNED-AST-3",
          name: "Available Monitor",
          category: "MONITOR",
          status: "AVAILABLE",
          assignedTo: null
        }
      ]);

      const res = await request(app)
        .get("/api/v1/assets/mine")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Employee Own Laptop");
      expect(res.body.data[0].assignedTo.email).toBe(employeeUser.email);
    });

    it("IT-M2-18 returns empty array when user has no assigned assets", async () => {
      const res = await request(app)
        .get("/api/v1/assets/mine")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe("GET /api/v1/assets/:id", () => {
    let testAsset;

    beforeEach(async () => {
      testAsset = await Asset.create({
        serialNumber: "ID-TEST-001",
        name: "ThinkPad T14",
        category: "LAPTOP",
        status: "ASSIGNED",
        assignedTo: employeeUser._id
      });
    });

    it("IT-M2-19 allows ADMIN and IT_SUPPORT to fetch single asset by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/assets/${testAsset._id}`)
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testAsset._id.toString());
      expect(res.body.data.assignedTo.email).toBe(employeeUser.email);
    });

    it("IT-M2-20 allows EMPLOYEE to view asset assigned to them", async () => {
      const res = await request(app)
        .get(`/api/v1/assets/${testAsset._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(testAsset._id.toString());
    });

    it("IT-M2-21 returns 403 when EMPLOYEE tries to view asset not assigned to them", async () => {
      const otherAsset = await Asset.create({
        serialNumber: "OTHER-UNASSIGNED",
        name: "Server Rack",
        category: "OTHER",
        status: "AVAILABLE",
        assignedTo: null
      });

      const res = await request(app)
        .get(`/api/v1/assets/${otherAsset._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("IT-M2-22 returns 400 for invalid ObjectId format", async () => {
      const res = await request(app)
        .get("/api/v1/assets/invalid-mongo-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M2-23 returns 404 for non-existent asset ID", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/api/v1/assets/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /api/v1/assets/:id (Update)", () => {
    let activeAsset;
    let retiredAsset;

    beforeEach(async () => {
      activeAsset = await Asset.create({
        serialNumber: "ACTIVE-001",
        name: "Original Name",
        category: "LAPTOP",
        status: "AVAILABLE",
        notes: "Original notes"
      });

      retiredAsset = await Asset.create({
        serialNumber: "RETIRED-001",
        name: "Old Retired Server",
        category: "OTHER",
        status: "RETIRED",
        notes: "Decommissioned 2025"
      });
    });

    it("IT-M2-24 updates editable fields (name, category, notes, serialNumber) for active asset", async () => {
      const res = await request(app)
        .put(`/api/v1/assets/${activeAsset._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Laptop Model",
          category: "DESKTOP",
          notes: "Updated inventory notes",
          serialNumber: "ACTIVE-001-MOD"
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Laptop Model");
      expect(res.body.data.category).toBe("DESKTOP");
      expect(res.body.data.notes).toBe("Updated inventory notes");
      expect(res.body.data.serialNumber).toBe("ACTIVE-001-MOD");
    });

    it("IT-M2-25 rejects duplicate serialNumber on update with 409", async () => {
      await Asset.create({
        serialNumber: "EXISTING-SN",
        name: "Another machine",
        category: "MONITOR"
      });

      const res = await request(app)
        .put(`/api/v1/assets/${activeAsset._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "EXISTING-SN"
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe("Serial number already registered");
    });

    it("IT-M2-26 allows updating ONLY notes on RETIRED assets", async () => {
      const res = await request(app)
        .put(`/api/v1/assets/${retiredAsset._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          notes: "Updated disposal records"
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe("Updated disposal records");
    });

    it("IT-M2-27 rejects editing non-notes fields on RETIRED assets with 400", async () => {
      const res = await request(app)
        .put(`/api/v1/assets/${retiredAsset._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Attempted Name Change"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Retired assets cannot be edited except notes");
    });
  });

  describe("PATCH /api/v1/assets/:id/assign", () => {
    let availableAsset;

    beforeEach(async () => {
      availableAsset = await Asset.create({
        serialNumber: "AVAIL-001",
        name: "MacBook Air",
        category: "LAPTOP",
        status: "AVAILABLE",
        assignedTo: null
      });
    });

    it("IT-M2-28 assigns AVAILABLE asset to an active user successfully", async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/${availableAsset._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ASSIGNED");
      expect(res.body.data.assignedTo._id).toBe(employeeUser._id.toString());
      expect(res.body.data.assignedTo.name).toBe(employeeUser.name);
    });

    it("IT-M2-29 rejects assigning non-available asset with 400 'Asset is not available'", async () => {
      const assignedAsset = await Asset.create({
        serialNumber: "ALREADY-ASSIGNED",
        name: "Busy Laptop",
        category: "LAPTOP",
        status: "ASSIGNED",
        assignedTo: employeeUser._id
      });

      const res = await request(app)
        .patch(`/api/v1/assets/${assignedAsset._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser2._id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Asset is not available");
    });

    it("IT-M2-30 double-assign race: two parallel requests -> exactly one 200", async () => {
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/v1/assets/${availableAsset._id}/assign`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ userId: employeeUser._id }),
        request(app)
          .patch(`/api/v1/assets/${availableAsset._id}/assign`)
          .set("Authorization", `Bearer ${supportToken}`)
          .send({ userId: employeeUser2._id })
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 400 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.status).toBe("ASSIGNED");
      expect(failRes.body.error.message).toBe("Asset is not available");
    });

    it("IT-M2-31 rejects assigning to inactive user with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/${availableAsset._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: inactiveUser._id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Cannot assign asset to an inactive user");
    });

    it("IT-M2-32 rejects assigning to non-existent user with 404", async () => {
      const nonExistentUserId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .patch(`/api/v1/assets/${availableAsset._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: nonExistentUserId });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe("User not found");
    });

    it("IT-M2-33 rejects assigning a RETIRED asset with 400 'Asset is not available'", async () => {
      const retiredAsset = await Asset.create({
        serialNumber: "RETIRED-CANNOT-ASSIGN",
        name: "Old PC",
        category: "DESKTOP",
        status: "RETIRED"
      });

      const res = await request(app)
        .patch(`/api/v1/assets/${retiredAsset._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Asset is not available");
    });
  });

  describe("PATCH /api/v1/assets/:id/unassign", () => {
    it("IT-M2-34 unassigns an ASSIGNED asset and resets to AVAILABLE with null assignedTo", async () => {
      const assignedAsset = await Asset.create({
        serialNumber: "TO-UNASSIGN",
        name: "Assigned Monitor",
        category: "MONITOR",
        status: "ASSIGNED",
        assignedTo: employeeUser._id
      });

      const res = await request(app)
        .patch(`/api/v1/assets/${assignedAsset._id}/unassign`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("AVAILABLE");
      expect(res.body.data.assignedTo).toBeNull();
    });

    it("IT-M2-35 rejects unassigning an asset that is not in ASSIGNED status with 400", async () => {
      const availableAsset = await Asset.create({
        serialNumber: "ALREADY-AVAIL",
        name: "Available Printer",
        category: "PRINTER",
        status: "AVAILABLE",
        assignedTo: null
      });

      const res = await request(app)
        .patch(`/api/v1/assets/${availableAsset._id}/unassign`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("Only assigned assets can be unassigned");
    });
  });

  describe("PATCH /api/v1/assets/:id/status", () => {
    let assignedAsset;

    beforeEach(async () => {
      assignedAsset = await Asset.create({
        serialNumber: "STATUS-CHANGE-AST",
        name: "Test Laptop",
        category: "LAPTOP",
        status: "ASSIGNED",
        assignedTo: employeeUser._id
      });
    });

    it("IT-M2-36 changing status to MAINTENANCE clears assignee", async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/${assignedAsset._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "MAINTENANCE" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("MAINTENANCE");
      expect(res.body.data.assignedTo).toBeNull();
    });

    it("IT-M2-37 changing status to RETIRED clears assignee", async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/${assignedAsset._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "RETIRED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RETIRED");
      expect(res.body.data.assignedTo).toBeNull();
    });

    it("IT-M2-38 rejects changing status of a RETIRED asset with 400", async () => {
      const retiredAsset = await Asset.create({
        serialNumber: "PERMANENT-RETIRED",
        name: "Scrapped Hardware",
        category: "OTHER",
        status: "RETIRED",
        assignedTo: null
      });

      const res = await request(app)
        .patch(`/api/v1/assets/${retiredAsset._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "AVAILABLE" });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Retired assets cannot change status");
    });

    it("IT-M2-39 rejects setting status to ASSIGNED directly via status endpoint with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/${assignedAsset._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "ASSIGNED" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Audit trail logging for asset mutations", () => {
    it("IT-M2-40 logs audit rows for ASSET_CREATE, ASSET_UPDATE, ASSET_ASSIGN, ASSET_UNASSIGN, and ASSET_STATUS", async () => {
      // 1. Create asset
      const createRes = await request(app)
        .post("/api/v1/assets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          serialNumber: "AUDIT-FLOW-01",
          name: "Audit Flow Laptop",
          category: "LAPTOP"
        });
      const assetId = createRes.body.data._id;

      // 2. Update asset
      await request(app)
        .put(`/api/v1/assets/${assetId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ notes: "Added audit notes" });

      // 3. Assign asset
      await request(app)
        .patch(`/api/v1/assets/${assetId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      // 4. Unassign asset
      await request(app)
        .patch(`/api/v1/assets/${assetId}/unassign`)
        .set("Authorization", `Bearer ${adminToken}`);

      // 5. Change status to MAINTENANCE
      await request(app)
        .patch(`/api/v1/assets/${assetId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "MAINTENANCE" });

      // Query audit logs
      const auditLogs = await AuditLog.find({ entity: "ASSET", entityId: assetId }).sort({
        createdAt: 1
      });

      const actions = auditLogs.map((log) => log.action);
      expect(actions).toEqual([
        "ASSET_CREATE",
        "ASSET_UPDATE",
        "ASSET_ASSIGN",
        "ASSET_UNASSIGN",
        "ASSET_STATUS"
      ]);

      const assignLog = auditLogs.find((log) => log.action === "ASSET_ASSIGN");
      expect(assignLog.details).toBe(`to ${employeeUser.name}`);

      const statusLog = auditLogs.find((log) => log.action === "ASSET_STATUS");
      expect(statusLog.details).toBe("from AVAILABLE to MAINTENANCE");
    });
  });
});
