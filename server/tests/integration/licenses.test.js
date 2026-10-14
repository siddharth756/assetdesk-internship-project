// Purpose: Integration tests for Module M3 Software Licenses and Expiry Alerts endpoints
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { License, User, AuditLog } = require("../../src/models");
const { startOfToday, addDays } = require("../../src/utils/dates");

describe("Software Licenses Integration Tests (Module M3)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let employeeUser2;
  let inactiveUser;
  let adminToken;
  let supportToken;
  let employeeToken;

  beforeEach(async () => {
    await License.deleteMany({});
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
      department: "Engineering",
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

  describe("POST /api/v1/licenses (Creation)", () => {
    it("IT-M3-01 allows ADMIN to create a license with valid fields", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "IntelliJ IDEA Ultimate",
          vendor: "JetBrains",
          licenseKey: "JB-IDEA-2026-ABCD-1234",
          totalSeats: 10,
          expiryDate: "2027-01-01T00:00:00.000Z",
          notes: "Developer team IDE licenses"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.softwareName).toBe("IntelliJ IDEA Ultimate");
      expect(res.body.data.vendor).toBe("JetBrains");
      expect(res.body.data.totalSeats).toBe(10);
      expect(res.body.data.usedSeats).toBe(0);
      expect(res.body.data.availableSeats).toBe(10);
      expect(res.body.data.status).toBe("ACTIVE");
      // ADMIN receives unmasked key on creation detail
      expect(res.body.data.licenseKey).toBe("JB-IDEA-2026-ABCD-1234");
    });

    it("IT-M3-02 allows IT_SUPPORT to create a license (receives masked key)", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${supportToken}`)
        .send({
          softwareName: "Figma Professional",
          vendor: "Figma Inc",
          licenseKey: "FIGMA-PRO-9876",
          totalSeats: 3,
          expiryDate: "2027-06-01T00:00:00.000Z"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseKey).toBe("****-****-9876");
    });

    it("IT-M3-03 rejects missing required softwareName with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          licenseKey: "SOME-KEY-1234",
          totalSeats: 5,
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M3-04 rejects missing licenseKey with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Slack Enterprise",
          totalSeats: 5,
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M3-05 rejects invalid totalSeats (< 1 or non-integer) with 400 VALIDATION_ERROR", async () => {
      const res1 = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Test Software",
          licenseKey: "KEY-1234",
          totalSeats: 0,
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe("VALIDATION_ERROR");

      const res2 = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Test Software",
          licenseKey: "KEY-1234",
          totalSeats: "invalid-number",
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res2.status).toBe(400);
    });

    it("IT-M3-06 rejects invalid expiryDate with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Test Software",
          licenseKey: "KEY-1234",
          totalSeats: 5,
          expiryDate: "not-a-real-date"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M3-07 forbids EMPLOYEE role from creating a license (403)", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          softwareName: "Unauthorized Software",
          licenseKey: "KEY-EMP-1234",
          totalSeats: 1,
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("IT-M3-08 rejects unauthenticated creation request with 401", async () => {
      const res = await request(app)
        .post("/api/v1/licenses")
        .send({
          softwareName: "No Auth Software",
          licenseKey: "KEY-NOAUTH",
          totalSeats: 1,
          expiryDate: "2027-01-01T00:00:00.000Z"
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/v1/licenses (Listing & Query filters)", () => {
    beforeEach(async () => {
      const today = startOfToday();

      await License.create({
        softwareName: "Old Photoshop CS6",
        vendor: "Adobe Systems",
        licenseKey: "ADOBE-CS6-EXPIRED-9999",
        totalSeats: 5,
        expiryDate: addDays(today, -10)
      });

      await License.create({
        softwareName: "JetBrains WebStorm",
        vendor: "JetBrains",
        licenseKey: "JB-WS-EXPIRING-8888",
        totalSeats: 4,
        expiryDate: addDays(today, 15)
      });

      await License.create({
        softwareName: "Microsoft 365 E5",
        vendor: "Microsoft Corporation",
        licenseKey: "MS365-ACTIVE-7777",
        totalSeats: 20,
        expiryDate: addDays(today, 120)
      });
    });


    it("IT-M3-09 lists licenses with pagination metadata and always masks licenseKey for ADMIN and IT_SUPPORT", async () => {
      const resAdmin = await request(app)
        .get("/api/v1/licenses?page=1&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
      expect(resAdmin.body.data.length).toBe(3);
      expect(resAdmin.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 3
      });
      // List view MUST show masked licenseKey even for ADMIN
      resAdmin.body.data.forEach((lic) => {
        expect(lic.licenseKey).toMatch(/^\*\*\*\*-\*\*\*\*-[A-Za-z0-9]+$/);
      });

      const resSupport = await request(app)
        .get("/api/v1/licenses")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(resSupport.status).toBe(200);
      resSupport.body.data.forEach((lic) => {
        expect(lic.licenseKey).toMatch(/^\*\*\*\*-\*\*\*\*-[A-Za-z0-9]+$/);
      });
    });

    it("IT-M3-10 supports search query q across softwareName and vendor", async () => {
      const res = await request(app)
        .get("/api/v1/licenses?q=Adobe")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].softwareName).toBe("Old Photoshop CS6");
    });

    it("IT-M3-11 filters licenses by status EXPIRED", async () => {
      const res = await request(app)
        .get("/api/v1/licenses?status=EXPIRED")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].softwareName).toBe("Old Photoshop CS6");
      expect(res.body.data[0].status).toBe("EXPIRED");
    });

    it("IT-M3-12 filters licenses by status EXPIRING", async () => {
      const res = await request(app)
        .get("/api/v1/licenses?status=EXPIRING")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].softwareName).toBe("JetBrains WebStorm");
      expect(res.body.data[0].status).toBe("EXPIRING");
    });

    it("IT-M3-13 filters licenses by status ACTIVE", async () => {
      const res = await request(app)
        .get("/api/v1/licenses?status=ACTIVE")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].softwareName).toBe("Microsoft 365 E5");
      expect(res.body.data[0].status).toBe("ACTIVE");
    });

    it("IT-M3-14 defaults to sorting by expiryDate ascending", async () => {
      const res = await request(app)
        .get("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].softwareName).toBe("Old Photoshop CS6"); // Expired first
      expect(res.body.data[1].softwareName).toBe("JetBrains WebStorm");
      expect(res.body.data[2].softwareName).toBe("Microsoft 365 E5"); // Farthest expiry
    });

    it("IT-M3-15 supports custom sort order (e.g. softwareName)", async () => {
      const res = await request(app)
        .get("/api/v1/licenses?sort=softwareName")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].softwareName).toBe("JetBrains WebStorm");
    });

    it("IT-M3-16 forbids EMPLOYEE role from listing licenses (403)", async () => {
      const res = await request(app)
        .get("/api/v1/licenses")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /api/v1/licenses/expiring", () => {
    beforeEach(async () => {
      const today = startOfToday();

      // Expired 5 days ago
      await License.create({
        softwareName: "Already Expired Tool",
        licenseKey: "KEY-EXP-0001",
        totalSeats: 2,
        expiryDate: addDays(today, -5)
      });


      // Expiring in 10 days
      await License.create({
        softwareName: "Expiring in 10 Days Tool",
        licenseKey: "KEY-EXP-010",
        totalSeats: 3,
        expiryDate: addDays(today, 10)
      });

      // Expiring in 28 days
      await License.create({
        softwareName: "Expiring in 28 Days Tool",
        licenseKey: "KEY-EXP-028",
        totalSeats: 4,
        expiryDate: addDays(today, 28)
      });

      // Expiring in 45 days (outside default 30 days)
      await License.create({
        softwareName: "Expiring in 45 Days Tool",
        licenseKey: "KEY-EXP-045",
        totalSeats: 5,
        expiryDate: addDays(today, 45)
      });
    });

    it("IT-M3-17 returns licenses expiring within default 30 days plus already expired, ordered by expiryDate", async () => {
      const res = await request(app)
        .get("/api/v1/licenses/expiring")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3); // -5, 10, 28 days
      expect(res.body.data[0].softwareName).toBe("Already Expired Tool");
      expect(res.body.data[1].softwareName).toBe("Expiring in 10 Days Tool");
      expect(res.body.data[2].softwareName).toBe("Expiring in 28 Days Tool");
      // Key masked in expiring list
      expect(res.body.data[0].licenseKey).toBe("****-****-0001");
    });

    it("IT-M3-18 supports custom days parameter (e.g. days=60)", async () => {
      const res = await request(app)
        .get("/api/v1/licenses/expiring?days=60")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4); // Includes the 45-day license
      expect(res.body.data[3].softwareName).toBe("Expiring in 45 Days Tool");
    });

    it("IT-M3-19 forbids EMPLOYEE role from accessing expiring licenses (403)", async () => {
      const res = await request(app)
        .get("/api/v1/licenses/expiring")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /api/v1/licenses/:id (Detail View & Masking)", () => {
    let testLicense;

    beforeEach(async () => {
      testLicense = await License.create({
        softwareName: "Postman Enterprise",
        vendor: "Postman Inc",
        licenseKey: "POSTMAN-ENT-SEC-5544",
        totalSeats: 15,
        expiryDate: "2027-04-01T00:00:00.000Z",
        notes: "API testing tool licenses"
      });
    });

    it("IT-M3-20 returns FULL unmasked license key to ADMIN in detail view", async () => {
      const res = await request(app)
        .get(`/api/v1/licenses/${testLicense._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseKey).toBe("POSTMAN-ENT-SEC-5544");
    });

    it("IT-M3-21 returns MASKED license key (****-****-XXXX) to IT_SUPPORT in detail view", async () => {
      const res = await request(app)
        .get(`/api/v1/licenses/${testLicense._id}`)
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseKey).toBe("****-****-5544");
    });

    it("IT-M3-22 returns 404 for non-existent license ID", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/api/v1/licenses/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("IT-M3-23 returns 400 for invalid ObjectId format", async () => {
      const res = await request(app)
        .get("/api/v1/licenses/invalid-id-format")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M3-24 forbids EMPLOYEE role from viewing license details (403)", async () => {
      const res = await request(app)
        .get(`/api/v1/licenses/${testLicense._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("PUT /api/v1/licenses/:id (Update)", () => {
    let testLicense;

    beforeEach(async () => {
      testLicense = await License.create({
        softwareName: "Initial Software Name",
        vendor: "Initial Vendor",
        licenseKey: "INIT-KEY-1122",
        totalSeats: 3,
        allocations: [
          { user: employeeUser._id, allocatedAt: new Date() },
          { user: employeeUser2._id, allocatedAt: new Date() }
        ],
        expiryDate: "2027-01-01T00:00:00.000Z",
        notes: "Initial notes"
      });
    });

    it("IT-M3-25 updates editable fields and totalSeats when >= usedSeats", async () => {
      const res = await request(app)
        .put(`/api/v1/licenses/${testLicense._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Updated Software Name",
          vendor: "Updated Vendor",
          totalSeats: 5,
          notes: "Expanded license capacity to 5"
        });

      expect(res.status).toBe(200);
      expect(res.body.data.softwareName).toBe("Updated Software Name");
      expect(res.body.data.vendor).toBe("Updated Vendor");
      expect(res.body.data.totalSeats).toBe(5);
      expect(res.body.data.usedSeats).toBe(2);
      expect(res.body.data.availableSeats).toBe(3);
    });

    it("IT-M3-26 rejects reducing totalSeats below currently allocated seats with 400", async () => {
      // testLicense currently has 2 allocated seats
      const res = await request(app)
        .put(`/api/v1/licenses/${testLicense._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          totalSeats: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("cannot be less than currently allocated seats");
    });

    it("IT-M3-27 returns 404 for non-existent license ID on update", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .put(`/api/v1/licenses/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ softwareName: "Ghost Software" });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/licenses/:id/allocate (Seat Allocation)", () => {
    let license;

    beforeEach(async () => {
      license = await License.create({
        softwareName: "Docker Desktop",
        licenseKey: "DOCKER-ENT-KEY-3333",
        totalSeats: 2,
        allocations: [],
        expiryDate: "2027-12-31T00:00:00.000Z"
      });
    });

    it("IT-M3-28 allocates seat to an active user successfully", async () => {
      const res = await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usedSeats).toBe(1);
      expect(res.body.data.availableSeats).toBe(1);
      expect(res.body.data.allocations.length).toBe(1);
      expect(res.body.data.allocations[0].user._id).toBe(employeeUser._id.toString());
    });

    it("IT-M3-29 allocates until full, then subsequent allocation fails with 400 'No seats available'", async () => {
      // Allocate seat 1
      await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      // Allocate seat 2 (reaches capacity 2 of 2)
      await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser2._id });

      // Create a 3rd user to attempt allocation
      const thirdUser = await User.create({
        name: "Third User",
        email: "third@assetdesk.local",
        passwordHash: "hash",
        role: "EMPLOYEE",
        isActive: true
      });

      const resFail = await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: thirdUser._id });

      expect(resFail.status).toBe(400);
      expect(resFail.body.error.message).toBe("No seats available");
    });

    it("IT-M3-30 rejects duplicate allocation to same user with 409", async () => {
      await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      const resDuplicate = await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      expect(resDuplicate.status).toBe(409);
      expect(resDuplicate.body.error.code).toBe("CONFLICT");
      expect(resDuplicate.body.error.message).toContain("already allocated");
    });

    it("IT-M3-31 rejects allocation to an inactive user with 400", async () => {
      const res = await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: inactiveUser._id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("inactive user");
    });

    it("IT-M3-32 rejects allocation with non-existent user ID with 404", async () => {
      const nonExistentUserId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post(`/api/v1/licenses/${license._id}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: nonExistentUserId });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe("User not found");
    });

    it("IT-M3-33 atomic race: two parallel allocations for last remaining seat result in exactly one 200 and one 400", async () => {
      // Set totalSeats = 1
      license.totalSeats = 1;
      await license.save();

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/licenses/${license._id}/allocate`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ userId: employeeUser._id }),
        request(app)
          .post(`/api/v1/licenses/${license._id}/allocate`)
          .set("Authorization", `Bearer ${supportToken}`)
          .send({ userId: employeeUser2._id })
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 400 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.usedSeats).toBe(1);
      expect(failRes.body.error.message).toBe("No seats available");
    });
  });

  describe("DELETE /api/v1/licenses/:id/allocate/:userId (Seat Release)", () => {
    let license;

    beforeEach(async () => {
      license = await License.create({
        softwareName: "GitHub Copilot Business",
        licenseKey: "COPILOT-BUS-4433",
        totalSeats: 5,
        allocations: [{ user: employeeUser._id, allocatedAt: new Date() }],
        expiryDate: "2027-12-31T00:00:00.000Z"
      });
    });

    it("IT-M3-34 releases allocated seat successfully (200)", async () => {
      const res = await request(app)
        .delete(`/api/v1/licenses/${license._id}/allocate/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usedSeats).toBe(0);
      expect(res.body.data.availableSeats).toBe(5);
      expect(res.body.data.allocations.length).toBe(0);
    });

    it("IT-M3-35 rejects releasing seat if user is not allocated with 404", async () => {
      const res = await request(app)
        .delete(`/api/v1/licenses/${license._id}/allocate/${employeeUser2._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain("not allocated a seat");
    });

    it("IT-M3-36 returns 404 for non-existent license ID on release", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .delete(`/api/v1/licenses/${nonExistentId}/allocate/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Audit trail logging for license operations", () => {
    it("IT-M3-37 writes audit logs for LICENSE_CREATE, LICENSE_UPDATE, LICENSE_ALLOCATE, and LICENSE_RELEASE", async () => {
      // 1. Create license
      const createRes = await request(app)
        .post("/api/v1/licenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          softwareName: "Tableau Desktop",
          vendor: "Salesforce",
          licenseKey: "TAB-DESK-2026-6677",
          totalSeats: 3,
          expiryDate: "2027-05-01T00:00:00.000Z"
        });

      const licenseId = createRes.body.data._id;

      // 2. Update license
      await request(app)
        .put(`/api/v1/licenses/${licenseId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ notes: "Added BI team license notes" });

      // 3. Allocate seat
      await request(app)
        .post(`/api/v1/licenses/${licenseId}/allocate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: employeeUser._id });

      // 4. Release seat
      await request(app)
        .delete(`/api/v1/licenses/${licenseId}/allocate/${employeeUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const auditLogs = await AuditLog.find({ entity: "LICENSE", entityId: licenseId }).sort({
        createdAt: 1
      });

      const actions = auditLogs.map((log) => log.action);
      expect(actions).toEqual([
        "LICENSE_CREATE",
        "LICENSE_UPDATE",
        "LICENSE_ALLOCATE",
        "LICENSE_RELEASE"
      ]);

      const allocateLog = auditLogs.find((l) => l.action === "LICENSE_ALLOCATE");
      expect(allocateLog.details).toBe(`Allocated seat to ${employeeUser.name}`);

      const releaseLog = auditLogs.find((l) => l.action === "LICENSE_RELEASE");
      expect(releaseLog.details).toBe(`Released seat for ${employeeUser.name}`);
    });
  });
});
