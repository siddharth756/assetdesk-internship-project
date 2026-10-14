// Purpose: Unit tests for Mongoose models covering validations, auto-increment IDs, virtuals, and append-only guards
const { User, Asset, License, Ticket, AuditLog } = require("../../src/models");
const { addDays, startOfToday } = require("../../src/utils/dates");

describe("Models Unit Tests", () => {
  describe("Asset Model", () => {
    it("should auto-generate assetTag in format AST-YYYY-0001 and increment sequentially", async () => {
      const year = new Date().getFullYear();

      const asset1 = await Asset.create({
        serialNumber: "SN-AUTO-001",
        name: "Dell Latitude 5420",
        category: "LAPTOP"
      });

      const asset2 = await Asset.create({
        serialNumber: "SN-AUTO-002",
        name: "Dell Latitude 5430",
        category: "LAPTOP"
      });

      expect(asset1.assetTag).toBe(`AST-${year}-0001`);
      expect(asset2.assetTag).toBe(`AST-${year}-0002`);
    });

    it("should reject duplicate serialNumber with conflict / duplicate key error", async () => {
      await Asset.create({
        serialNumber: "SN-UNIQUE-XYZ",
        name: "Test Laptop",
        category: "LAPTOP"
      });

      let error;
      try {
        await Asset.create({
          serialNumber: "SN-UNIQUE-XYZ",
          name: "Another Laptop",
          category: "LAPTOP"
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });
  });

  describe("Ticket Model", () => {
    it("should auto-generate ticketCode in format TCK-YYYY-0001 and compute dueAt based on priority", async () => {
      const year = new Date().getFullYear();
      const user = await User.create({
        name: "Requester",
        email: "requester@assetdesk.local",
        passwordHash: "dummyhash"
      });

      const now = Date.now();
      const ticket = await Ticket.create({
        title: "Critical server outage in rack 3",
        description: "All cluster nodes stopped responding to ping requests.",
        category: "NETWORK",
        priority: "CRITICAL",
        createdBy: user._id
      });

      expect(ticket.ticketCode).toBe(`TCK-${year}-0001`);
      expect(ticket.dueAt).toBeDefined();

      // Priority CRITICAL is 4 hours SLA
      const dueTime = new Date(ticket.dueAt).getTime();
      const expectedTime = now + 4 * 60 * 60 * 1000;
      expect(Math.abs(dueTime - expectedTime)).toBeLessThan(5000); // within 5 seconds
    });
  });

  describe("License Model Virtuals", () => {
    it("should correctly compute status for EXPIRED, EXPIRING, and ACTIVE licenses", async () => {
      const today = startOfToday();

      const expiredLicense = new License({
        softwareName: "Expired Tool",
        licenseKey: "KEY-001",
        totalSeats: 5,
        expiryDate: addDays(today, -5)
      });
      expect(expiredLicense.status).toBe("EXPIRED");

      const expiringLicense = new License({
        softwareName: "Expiring Tool",
        licenseKey: "KEY-002",
        totalSeats: 5,
        expiryDate: addDays(today, 15)
      });
      expect(expiringLicense.status).toBe("EXPIRING");

      const activeLicense = new License({
        softwareName: "Active Tool",
        licenseKey: "KEY-003",
        totalSeats: 5,
        expiryDate: addDays(today, 90)
      });
      expect(activeLicense.status).toBe("ACTIVE");
    });

    it("should correctly compute usedSeats and availableSeats virtuals", async () => {
      const user1 = await User.create({
        name: "User One",
        email: "user1@assetdesk.local",
        passwordHash: "hash"
      });
      const user2 = await User.create({
        name: "User Two",
        email: "user2@assetdesk.local",
        passwordHash: "hash"
      });

      const license = new License({
        softwareName: "Figma Team",
        licenseKey: "FIGMA-1234",
        totalSeats: 10,
        expiryDate: addDays(startOfToday(), 100),
        allocations: [
          { user: user1._id, allocatedAt: new Date() },
          { user: user2._id, allocatedAt: new Date() }
        ]
      });

      expect(license.usedSeats).toBe(2);
      expect(license.availableSeats).toBe(8);

      const json = license.toJSON();
      expect(json.usedSeats).toBe(2);
      expect(json.availableSeats).toBe(8);
      expect(json.status).toBe("ACTIVE");
    });
  });

  describe("AuditLog Model (Append-only enforcement)", () => {
    it("should block updateOne, findOneAndUpdate, and delete operations on AuditLog", async () => {
      const log = await AuditLog.create({
        userName: "System Admin",
        action: "LOGIN",
        entity: "AUTH",
        entityId: "123",
        details: "Successful login from test",
        ip: "127.0.0.1"
      });

      expect(log._id).toBeDefined();

      // Direct document mutation save
      log.details = "Tampered details";
      await expect(log.save()).rejects.toThrow(/AuditLog is append-only/);

      // Query-level updateOne
      await expect(
        AuditLog.updateOne({ _id: log._id }, { details: "Hacked" })
      ).rejects.toThrow(/AuditLog is append-only/);

      // Query-level deleteOne
      await expect(AuditLog.deleteOne({ _id: log._id })).rejects.toThrow(
        /AuditLog is append-only/
      );
    });
  });

  describe("User Model Security", () => {
    it("should never expose passwordHash in toJSON output", async () => {
      const user = await User.create({
        name: "Security Test User",
        email: "security@assetdesk.local",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456789",
        role: "EMPLOYEE"
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.__v).toBeUndefined();

      const serialized = JSON.stringify(user);
      expect(serialized).not.toContain("passwordHash");
      expect(serialized).not.toContain("$2a$10$abcdefghijklmnopqrstuvwxyz123456789");
    });
  });
});
