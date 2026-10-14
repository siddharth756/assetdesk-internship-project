// Purpose: Comprehensive security integration tests verifying injection defenses, JWT integrity, role enforcement, and headers (Part 9 Step 3)
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, Ticket } = require("../../src/models");
const { sanitizeCell } = require("../../src/services/csv");

describe("Security Integration Tests (IDs SEC-01..SEC-12)", () => {
  let adminUser;
  let employee1;
  let employee2;
  let adminToken;
  let emp1Token;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Demo@1234", 10);

    adminUser = await User.create({
      name: "Security Admin",
      email: "secadmin@assetdesk.local",
      passwordHash,
      role: "ADMIN",
      department: "Security",
      isActive: true
    });

    employee1 = await User.create({
      name: "Employee One",
      email: "emp1.sec@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Engineering",
      isActive: true
    });

    employee2 = await User.create({
      name: "Employee Two",
      email: "emp2.sec@assetdesk.local",
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

    emp1Token = jwt.sign(
      { id: employee1._id, role: employee1.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );
  });

  it("SEC-01 NoSQL injection payload on login -> 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: { $gt: "" },
        password: "Demo@1234"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("SEC-02 tampered JWT role claim -> 401", async () => {
    const forgedToken = jwt.sign(
      { id: employee1._id, role: "ADMIN" },
      "malicious_secret_key_12345",
      { expiresIn: "1h", algorithm: "HS256" }
    );

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("SEC-03 expired token -> 401", async () => {
    const expiredToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      config.JWT_SECRET,
      { expiresIn: "-10s", algorithm: "HS256" }
    );

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("SEC-04 employee calling admin endpoints -> 403", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${emp1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("SEC-05 employee reading another user's ticket -> 404", async () => {
    const ticket2 = await Ticket.create({
      title: "Private Employee 2 Issue",
      description: "Employee 2 confidential ticket details",
      category: "HARDWARE",
      priority: "MEDIUM",
      createdBy: employee2._id,
      status: "OPEN"
    });

    const res = await request(app)
      .get(`/api/v1/tickets/${ticket2._id}`)
      .set("Authorization", `Bearer ${emp1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("SEC-06 password hash never in responses", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "secadmin@assetdesk.local", password: "Demo@1234" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(loginRes.body)).not.toContain("passwordHash");

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.passwordHash).toBeUndefined();
    expect(JSON.stringify(meRes.body)).not.toContain("passwordHash");

    const usersRes = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(JSON.stringify(usersRes.body)).not.toContain("passwordHash");
  });

  it("SEC-07 rate limit on login returns 429 after the limit", async () => {
    // Send 10 rapid attempts with testing header enabled
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/v1/auth/login")
        .set("x-test-rate-limit", "true")
        .send({ email: "secadmin@assetdesk.local", password: "WrongPassword" });
    }

    // 11th attempt must be rejected with 429
    const blockedRes = await request(app)
      .post("/api/v1/auth/login")
      .set("x-test-rate-limit", "true")
      .send({ email: "secadmin@assetdesk.local", password: "Demo@1234" });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.error.code).toBe("RATE_LIMITED");
  });

  it("SEC-08 XSS string stored as plain text and returned escaped as data (JSON)", async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${emp1Token}`)
      .send({
        title: `XSS Test ${xssPayload}`,
        description: `Description with payload ${xssPayload}`,
        category: "SOFTWARE",
        priority: "LOW"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.data.title).toBe(`XSS Test ${xssPayload}`);

    // Verify stored text is raw data in database and not evaluated as HTML
    const fetchRes = await request(app)
      .get(`/api/v1/tickets/${res.body.data._id}`)
      .set("Authorization", `Bearer ${emp1Token}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.headers["content-type"]).toContain("application/json");
    expect(fetchRes.body.data.title).toBe(`XSS Test ${xssPayload}`);
  });

  it("SEC-09 oversized body rejected", async () => {
    // Body limit is 100kb; send payload > 105kb
    const largeString = "A".repeat(110 * 1024);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "secadmin@assetdesk.local",
        password: largeString
      });

    // Body-parser returns 413 Payload Too Large
    expect(res.status).toBe(413);
  });

  it("SEC-10 helmet headers present", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty("x-dns-prefetch-control");
    expect(res.headers).toHaveProperty("x-frame-options");
    expect(res.headers).toHaveProperty("x-content-type-options");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("SEC-11 CORS blocks other origin", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .set("Origin", "http://evil-attacker-site.com");

    expect(res.status).toBe(200);
    // Origin is restricted to CLIENT_ORIGIN (http://localhost:5173); evil origin is not reflected
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil-attacker-site.com");
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("SEC-12 CSV injection prefix applied", () => {
    const formulaPayloads = [
      "=cmd|' /C calc'!A0",
      "+123456789",
      "-99999",
      "@SUM(1,2)"
    ];

    formulaPayloads.forEach((payload) => {
      const sanitized = sanitizeCell(payload);
      // Ensure formula trigger is prefixed with single quote
      expect(sanitized).toMatch(/^("?)'/);
    });
  });
});
