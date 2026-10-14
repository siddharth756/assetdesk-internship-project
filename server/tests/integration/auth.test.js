// Purpose: Integration tests for Module M1 Authentication endpoints
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { User, AuditLog } = require("../../src/models");

describe("Auth Integration Tests (Module M1)", () => {
  let activeUser;
  let validToken;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123", 10);

    activeUser = await User.create({
      name: "John Active",
      email: "john.active@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Engineering",
      isActive: true
    });

    await User.create({
      name: "Jane Inactive",
      email: "jane.inactive@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Marketing",
      isActive: false
    });

    validToken = jwt.sign(
      { id: activeUser._id, role: activeUser.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );
  });

  describe("POST /api/v1/auth/login", () => {
    it("1. login ok: should authenticate active user and return JWT token and user profile", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "Password123"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
      expect(typeof res.body.data.token).toBe("string");
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe("john.active@assetdesk.local");
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("2. wrong password: should return 401 with generic error message", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "WrongPassword999"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("3. unknown email: should return 401 with identical generic error message", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "unknown.user@assetdesk.local",
          password: "Password123"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("4. inactive user blocked: should reject login for deactivated user with 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "jane.inactive@assetdesk.local",
          password: "Password123"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/deactivated|inactive/i);
    });

    it("5. NoSQL-injection style payload: should reject object payload with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $gt: "" },
          password: "x"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it("6. missing fields: should return 400 VALIDATION_ERROR when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("7. audit rows created for successful login", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "Password123"
        });

      const audit = await AuditLog.findOne({
        action: "LOGIN",
        entity: "AUTH",
        entityId: activeUser._id.toString()
      });

      expect(audit).not.toBeNull();
      expect(audit.userName).toBe(activeUser.name);
      expect(audit.details).toContain("successfully");
    });

    it("8. audit rows created for failed login", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "WrongPassword123"
        });

      const audit = await AuditLog.findOne({
        action: "LOGIN_FAILED",
        entity: "AUTH"
      });

      expect(audit).not.toBeNull();
      expect(audit.details).toMatch(/Failed login attempt/);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("9. me with valid token: should return current authenticated user profile", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(activeUser.email);
      expect(res.body.data.name).toBe(activeUser.name);
      expect(res.body.data.role).toBe(activeUser.role);
    });

    it("10. me without token: should return 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("11. tampered token: should return 401 UNAUTHORIZED", async () => {
      const tampered = `${validToken.slice(0, -6)}tamper`;
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("12. expired token: should return 401 UNAUTHORIZED with expired message", async () => {
      const expiredToken = jwt.sign(
        { id: activeUser._id, role: activeUser.role },
        config.JWT_SECRET,
        { expiresIn: "-10s", algorithm: "HS256" }
      );

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/expired/i);
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    it("13. change password ok: should update password and allow login with new password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: "Password123",
          newPassword: "BrandNewPass456"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/success/i);

      // Verify old password fails
      const failedLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "Password123"
        });
      expect(failedLogin.status).toBe(401);

      // Verify new password succeeds
      const successfulLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john.active@assetdesk.local",
          password: "BrandNewPass456"
        });
      expect(successfulLogin.status).toBe(200);
    });

    it("14. change password wrong current: should reject with 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: "IncorrectCurrentPass",
          newPassword: "BrandNewPass456"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/incorrect|does not match/i);
    });

    it("15. change password weak new: should reject password without digits or under 8 chars with 400", async () => {
      // Too short
      const resShort = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: "Password123",
          newPassword: "Pass1"
        });
      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe("VALIDATION_ERROR");

      // No digits
      const resNoDigits = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: "Password123",
          newPassword: "PasswordNoDigits"
        });
      expect(resNoDigits.status).toBe(400);
      expect(resNoDigits.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("16. audit row created for PASSWORD_CHANGE", async () => {
      await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: "Password123",
          newPassword: "UpdatedSecure99"
        });

      const audit = await AuditLog.findOne({
        action: "PASSWORD_CHANGE",
        entity: "AUTH",
        entityId: activeUser._id.toString()
      });

      expect(audit).not.toBeNull();
      expect(audit.userName).toBe(activeUser.name);
    });
  });
});
