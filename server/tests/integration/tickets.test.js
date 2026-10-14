// Purpose: Integration tests for Module M4 Support Tickets endpoints
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../../src/app");
const config = require("../../src/config/env");
const { Ticket, Asset, User, AuditLog, Counter } = require("../../src/models");
const { addHours } = require("../../src/utils/dates");

describe("Support Tickets Integration Tests (Module M4)", () => {
  let adminUser;
  let supportUser;
  let employeeUser;
  let employeeUser2;
  let inactiveUser;
  let adminToken;
  let supportToken;
  let employeeToken;
  let employeeToken2;
  let sampleAsset;

  beforeEach(async () => {
    // Reset Counter and collections before each test run
    await Counter.deleteMany({});
    await Ticket.deleteMany({});
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
      name: "Inactive Support",
      email: "inactive-support@assetdesk.local",
      passwordHash,
      role: "IT_SUPPORT",
      department: "IT Support",
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

    employeeToken2 = jwt.sign(
      { id: employeeUser2._id, role: employeeUser2.role },
      config.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" }
    );

    // Create a sample asset for tickets with relatedAsset
    sampleAsset = await Asset.create({
      serialNumber: "SN-TCK-TEST-001",
      name: "Dell UltraSharp Monitor",
      category: "MONITOR",
      status: "AVAILABLE"
    });
  });

  describe("POST /api/v1/tickets (Create Ticket)", () => {
    it("IT-M4-01 employee creates ticket ok with default priority MEDIUM and status OPEN", async () => {
      const year = new Date().getFullYear();
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Monitor screen flickering at 60Hz",
          description: "External monitor blinks black every few minutes while working on Photoshop.",
          category: "HARDWARE"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketCode).toBe(`TCK-${year}-0001`);
      expect(res.body.data.title).toBe("Monitor screen flickering at 60Hz");
      expect(res.body.data.priority).toBe("MEDIUM");
      expect(res.body.data.status).toBe("OPEN");
      expect(res.body.data.createdBy._id).toBe(employeeUser._id.toString());
      expect(res.body.data.createdBy.email).toBe("employee@assetdesk.local");
      expect(res.body.data.dueAt).toBeDefined();

      // Audit check
      const audit = await AuditLog.findOne({ action: "TICKET_CREATE" });
      expect(audit).toBeDefined();
      expect(audit.entity).toBe("TICKET");
      expect(audit.entityId).toBe(res.body.data._id);
      expect(audit.details).toContain(`Created ticket TCK-${year}-0001`);
    });

    it("IT-M4-02 code format and increment sequentially", async () => {
      const year = new Date().getFullYear();

      const res1 = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "First issue regarding VPN",
          description: "Cannot connect to VPN endpoint from remote location.",
          category: "NETWORK"
        });

      const res2 = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken2}`)
        .send({
          title: "Second issue regarding Slack login",
          description: "Single sign on loops back to login prompt repeatedly.",
          category: "SOFTWARE"
        });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.data.ticketCode).toBe(`TCK-${year}-0001`);
      expect(res2.body.data.ticketCode).toBe(`TCK-${year}-0002`);
    });

    it("IT-M4-03 creates ticket with explicit priority and valid relatedAsset", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Monitor firmware update needed",
          description: "Display port sleep state issues require latest vendor firmware patch.",
          category: "HARDWARE",
          priority: "HIGH",
          relatedAsset: sampleAsset._id.toString()
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe("HIGH");
      expect(res.body.data.relatedAsset).toBeDefined();
      expect(res.body.data.relatedAsset.assetTag).toBe(sampleAsset.assetTag);
    });

    it("IT-M4-04 relatedAsset invalid returns 400 when asset does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Hardware replacement request",
          description: "Keyboard spacebar is stuck and needs mechanical switch replacement.",
          category: "HARDWARE",
          relatedAsset: nonExistentId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Related asset not found/i);
    });

    it("IT-M4-05 relatedAsset invalid returns 400 when ID format is malformed", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Hardware replacement request",
          description: "Keyboard spacebar is stuck and needs mechanical switch replacement.",
          category: "HARDWARE",
          relatedAsset: "not-a-valid-mongo-id"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("IT-M4-06 rejects ticket creation when title is too short (< 5 chars)", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Fix",
          description: "Laptop screen won't turn on after sleep mode.",
          category: "HARDWARE"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT-M4-07 rejects ticket creation when description is missing", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Laptop screen issue",
          category: "HARDWARE"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("IT-M4-08 rejects ticket creation when category is invalid", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Invalid category test issue",
          description: "Some detailed description for validation testing.",
          category: "INVALID_CAT"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/tickets (List and Filters)", () => {
    let tckEmp1;
    let tckEmp2;
    let tckSupportAssigned;
    let tckOverdue;

    beforeEach(async () => {
      // Create ticket for employeeUser
      tckEmp1 = await Ticket.create({
        title: "Employee 1 VPN issue",
        description: "Frequent disconnection from office subnet.",
        category: "NETWORK",
        priority: "HIGH",
        status: "OPEN",
        createdBy: employeeUser._id
      });

      // Create ticket for employeeUser2
      tckEmp2 = await Ticket.create({
        title: "Employee 2 email bounce error",
        description: "Outgoing messages to clients return 550 relay access denied.",
        category: "SOFTWARE",
        priority: "MEDIUM",
        status: "OPEN",
        createdBy: employeeUser2._id
      });

      // Create assigned ticket
      tckSupportAssigned = await Ticket.create({
        title: "Printer paper jam on floor 3",
        description: "Tray 2 jammed with heavy cardstock paper.",
        category: "HARDWARE",
        priority: "LOW",
        status: "IN_PROGRESS",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id
      });

      // Create overdue ticket (past dueAt)
      tckOverdue = await Ticket.create({
        title: "Critical server failure in data center",
        description: "Primary DNS resolver unreachable from DMZ zone.",
        category: "NETWORK",
        priority: "CRITICAL",
        status: "OPEN",
        createdBy: employeeUser2._id,
        dueAt: addHours(new Date(), -10)
      });
    });

    it("IT-M4-09 employee list only own tickets (auto restricted to createdBy = self)", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      const ticketIds = res.body.data.map((t) => t._id);
      expect(ticketIds).toContain(tckEmp1._id.toString());
      expect(ticketIds).toContain(tckSupportAssigned._id.toString());
      expect(ticketIds).not.toContain(tckEmp2._id.toString());
      expect(ticketIds).not.toContain(tckOverdue._id.toString());
    });

    it("IT-M4-10 employee list ignores any attempt to pass another createdBy filter", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets?createdBy=${employeeUser2._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      // Still only returns own tickets
      res.body.data.forEach((t) => {
        expect(t.createdBy._id).toBe(employeeUser._id.toString());
      });
    });

    it("IT-M4-11 support sees all tickets across all users", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
    });

    it("IT-M4-12 admin sees all tickets across all users", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
    });

    it("IT-M4-13 filters tickets by status", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?status=IN_PROGRESS")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(tckSupportAssigned._id.toString());
    });

    it("IT-M4-14 filters tickets by priority", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?priority=CRITICAL")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(tckOverdue._id.toString());
    });

    it("IT-M4-15 filters tickets by category", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?category=HARDWARE")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(tckSupportAssigned._id.toString());
    });

    it("IT-M4-16 filters tickets by assignedTo=me", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?assignedTo=me")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(tckSupportAssigned._id.toString());
    });

    it("IT-M4-17 filters tickets by assignedTo=none (unassigned)", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?assignedTo=none")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      res.body.data.forEach((t) => {
        expect(t.assignedTo).toBeNull();
      });
    });

    it("IT-M4-18 overdue filter: overdue=true returns only not RESOLVED/CLOSED tickets past dueAt", async () => {
      // Also add a resolved ticket whose dueAt is past to ensure it's excluded
      await Ticket.create({
        title: "Past resolved ticket",
        description: "This ticket was resolved before SLA expiration.",
        category: "ACCESS",
        priority: "MEDIUM",
        status: "RESOLVED",
        resolutionNote: "Access granted successfully",
        createdBy: employeeUser._id,
        dueAt: addHours(new Date(), -5)
      });

      const res = await request(app)
        .get("/api/v1/tickets?overdue=true")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(tckOverdue._id.toString());
    });

    it("IT-M4-19 searches tickets by q matching title or ticketCode", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?q=printer")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toContain("Printer");
    });

    it("IT-M4-20 paginates ticket list with meta { page, limit, total }", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?page=1&limit=2")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 4
      });
    });
  });

  describe("GET /api/v1/tickets/:id (Get Ticket by ID)", () => {
    let emp1Ticket;
    let emp2Ticket;

    beforeEach(async () => {
      emp1Ticket = await Ticket.create({
        title: "Emily's laptop trackpad unresponsive",
        description: "Built in multi touch trackpad does not register clicks.",
        category: "HARDWARE",
        createdBy: employeeUser._id,
        comments: [
          {
            author: employeeUser._id,
            message: "Rebooting into diagnostic mode did not resolve."
          }
        ]
      });

      emp2Ticket = await Ticket.create({
        title: "David's database query timeout",
        description: "Complex join query taking longer than 60s gateway limit.",
        category: "SOFTWARE",
        createdBy: employeeUser2._id
      });
    });

    it("IT-M4-21 employee can get own ticket including comments with author names", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${emp1Ticket._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(emp1Ticket._id.toString());
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].author.name).toBe("Employee User");
      expect(res.body.data.comments[0].author.email).toBe("employee@assetdesk.local");
    });

    it("IT-M4-22 employee cannot open someone else's ticket (returns 404 to avoid leaking existence)", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${emp2Ticket._id}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Ticket not found/i);
    });

    it("IT-M4-23 support can open any ticket by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${emp1Ticket._id}`)
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(emp1Ticket._id.toString());
    });

    it("IT-M4-24 returns 404 for non-existent ticket ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/tickets/${nonExistentId}`)
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(404);
    });

    it("IT-M4-25 returns 400 for malformed ticket ID", async () => {
      const res = await request(app)
        .get("/api/v1/tickets/invalid-id-format")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/v1/tickets/:id/assign (Ticket Assignment)", () => {
    let openTicket;

    beforeEach(async () => {
      openTicket = await Ticket.create({
        title: "Docker container registry auth failure",
        description: "Error response from daemon: Get authorization token forbidden.",
        category: "SOFTWARE",
        createdBy: employeeUser._id,
        status: "OPEN"
      });
    });

    it("IT-M4-26 assign moves OPEN ticket automatically to IN_PROGRESS and writes audit", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${openTicket._id}/assign`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ assignedTo: supportUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("IN_PROGRESS");
      expect(res.body.data.assignedTo._id).toBe(supportUser._id.toString());
      expect(res.body.data.assignedTo.name).toBe("Support User");

      // Verify audit trail
      const audit = await AuditLog.findOne({ action: "TICKET_ASSIGN" });
      expect(audit).toBeDefined();
      expect(audit.entity).toBe("TICKET");
      expect(audit.entityId).toBe(openTicket._id.toString());
      expect(audit.details).toContain(`Assigned ticket ${openTicket.ticketCode} to Support User`);
    });

    it("IT-M4-27 assign to employee user rejected with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${openTicket._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: employeeUser._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/active administrator or IT support staff/i);
    });

    it("IT-M4-28 assign to inactive user rejected with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${openTicket._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: inactiveUser._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/inactive/i);
    });

    it("IT-M4-29 employee forbidden from assigning tickets (returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${openTicket._id}/assign`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ assignedTo: supportUser._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("IT-M4-30 cannot assign a CLOSED ticket (returns 400)", async () => {
      const closedTicket = await Ticket.create({
        title: "Already closed ticket",
        description: "Closed maintenance request.",
        category: "OTHER",
        status: "CLOSED",
        createdBy: employeeUser._id,
        closedAt: new Date()
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${closedTicket._id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ assignedTo: supportUser._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Ticket is closed/i);
    });
  });

  describe("PATCH /api/v1/tickets/:id/status (Lifecycle State Machine)", () => {
    it("IT-M4-31 full happy path: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED", async () => {
      // 1. Create ticket in OPEN status
      const ticket = await Ticket.create({
        title: "Full lifecycle happy path ticket",
        description: "Testing state machine transitions according to Rule 5.",
        category: "HARDWARE",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id // already assigned
      });
      expect(ticket.status).toBe("OPEN");

      // 2. OPEN -> IN_PROGRESS
      const resProgress = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(resProgress.status).toBe(200);
      expect(resProgress.body.data.status).toBe("IN_PROGRESS");

      // 3. IN_PROGRESS -> RESOLVED (with resolutionNote)
      const resResolved = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: "Replaced faulty RAM module with new 16GB DDR5 stick."
        });

      expect(resResolved.status).toBe(200);
      expect(resResolved.body.data.status).toBe("RESOLVED");
      expect(resResolved.body.data.resolvedAt).toBeDefined();
      expect(resResolved.body.data.resolutionNote).toBe(
        "Replaced faulty RAM module with new 16GB DDR5 stick."
      );

      // 4. RESOLVED -> CLOSED
      const resClosed = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "CLOSED" });

      expect(resClosed.status).toBe(200);
      expect(resClosed.body.data.status).toBe("CLOSED");
      expect(resClosed.body.data.closedAt).toBeDefined();
    });

    it("IT-M4-32 invalid transitions (OPEN -> RESOLVED, OPEN -> CLOSED) return 400", async () => {
      const ticket = await Ticket.create({
        title: "Testing invalid direct skip transitions",
        description: "Attempting to skip mandatory in progress step.",
        category: "NETWORK",
        createdBy: employeeUser._id,
        status: "OPEN"
      });

      // OPEN -> RESOLVED is invalid
      const res1 = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: "Trying to resolve directly from open"
        });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.error.message).toMatch(/Invalid status transition from OPEN to RESOLVED/i);

      // OPEN -> CLOSED is invalid
      const res2 = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "CLOSED" });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.message).toMatch(/Invalid status transition from OPEN to CLOSED/i);
    });

    it("IT-M4-33 transition to IN_PROGRESS without assignedTo returns 400", async () => {
      const unassignedTicket = await Ticket.create({
        title: "Unassigned ticket trying to start progress",
        description: "Rule 5 requires an assigned user before moving to IN_PROGRESS.",
        category: "OTHER",
        createdBy: employeeUser._id,
        status: "OPEN",
        assignedTo: null
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${unassignedTicket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Assigned user is required/i);
    });

    it("IT-M4-34 resolve without note returns 400", async () => {
      const inProgressTicket = await Ticket.create({
        title: "In progress ticket resolving without note",
        description: "Resolution note requirement validation.",
        category: "SOFTWARE",
        createdBy: employeeUser._id,
        status: "IN_PROGRESS",
        assignedTo: supportUser._id
      });

      // No note
      const resNoNote = await request(app)
        .patch(`/api/v1/tickets/${inProgressTicket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "RESOLVED" });

      expect(resNoNote.status).toBe(400);
      expect(resNoNote.body.success).toBe(false);
      expect(resNoNote.body.error.message).toMatch(/Resolution note of at least 5 characters/i);

      // Note too short (< 5 chars)
      const resShortNote = await request(app)
        .patch(`/api/v1/tickets/${inProgressTicket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "RESOLVED", resolutionNote: "Done" });

      expect(resShortNote.status).toBe(400);
      expect(resShortNote.body.success).toBe(false);
    });

    it("IT-M4-35 employee reopen own resolved ticket (RESOLVED -> IN_PROGRESS) clears resolvedAt", async () => {
      const resolvedTicket = await Ticket.create({
        title: "Employee ticket was resolved but problem recurred",
        description: "Wifi disconnected again after reboot.",
        category: "NETWORK",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id,
        status: "RESOLVED",
        resolutionNote: "Restarted router",
        resolvedAt: new Date()
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${resolvedTicket._id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("IN_PROGRESS");
      expect(res.body.data.resolvedAt).toBeNull();

      // Check audit log for status change
      const audit = await AuditLog.findOne({
        action: "TICKET_STATUS",
        entityId: resolvedTicket._id.toString()
      });
      expect(audit).toBeDefined();
      expect(audit.details).toBe("Status changed from RESOLVED to IN_PROGRESS");
    });

    it("IT-M4-36 employee cannot change status otherwise (returns 403)", async () => {
      const openTicket = await Ticket.create({
        title: "Employee own open ticket",
        description: "Employee attempts unauthorized state transition.",
        category: "HARDWARE",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id,
        status: "OPEN"
      });

      // Employee cannot move OPEN -> IN_PROGRESS
      const res = await request(app)
        .patch(`/api/v1/tickets/${openTicket._id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Employees can only reopen/i);
    });

    it("IT-M4-37 employee cannot change status on someone else's ticket (returns 404)", async () => {
      const resolvedTicketEmp2 = await Ticket.create({
        title: "Employee 2 resolved ticket",
        description: "Belongs to employee 2.",
        category: "ACCESS",
        createdBy: employeeUser2._id,
        assignedTo: supportUser._id,
        status: "RESOLVED",
        resolutionNote: "Completed",
        resolvedAt: new Date()
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${resolvedTicketEmp2._id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("IT-M4-38 closed ticket immutable: any status change returns 400 Ticket is closed", async () => {
      const closedTicket = await Ticket.create({
        title: "Immutable closed ticket",
        description: "Already finalized ticket.",
        category: "OTHER",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id,
        status: "CLOSED",
        closedAt: new Date()
      });

      // Attempt by admin
      const resAdmin = await request(app)
        .patch(`/api/v1/tickets/${closedTicket._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(resAdmin.status).toBe(400);
      expect(resAdmin.body.error.message).toMatch(/Ticket is closed/i);

      // Attempt by employee owner
      const resEmp = await request(app)
        .patch(`/api/v1/tickets/${closedTicket._id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(resEmp.status).toBe(400);
      expect(resEmp.body.error.message).toMatch(/Ticket is closed/i);
    });

    it("IT-M4-39 audit row written with format 'Status changed from X to Y'", async () => {
      const ticket = await Ticket.create({
        title: "Audit logging test ticket",
        description: "Testing audit row details format.",
        category: "SOFTWARE",
        createdBy: employeeUser._id,
        assignedTo: supportUser._id,
        status: "OPEN"
      });

      await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/status`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ status: "IN_PROGRESS" });

      const audit = await AuditLog.findOne({
        action: "TICKET_STATUS",
        entityId: ticket._id.toString()
      });

      expect(audit).toBeDefined();
      expect(audit.details).toBe("Status changed from OPEN to IN_PROGRESS");
    });
  });

  describe("POST /api/v1/tickets/:id/comments (Ticket Comments)", () => {
    let emp1Ticket;
    let emp2Ticket;
    let closedTicket;

    beforeEach(async () => {
      emp1Ticket = await Ticket.create({
        title: "Emily's active ticket for comments",
        description: "Testing comment permissions and audit trail.",
        category: "SOFTWARE",
        createdBy: employeeUser._id,
        status: "OPEN"
      });

      emp2Ticket = await Ticket.create({
        title: "David's ticket for comments",
        description: "Another employee ticket.",
        category: "ACCESS",
        createdBy: employeeUser2._id,
        status: "OPEN"
      });

      closedTicket = await Ticket.create({
        title: "Closed ticket refusing comments",
        description: "Closed tickets are immutable.",
        category: "HARDWARE",
        createdBy: employeeUser._id,
        status: "CLOSED",
        closedAt: new Date()
      });
    });

    it("IT-M4-40 employee can comment on own open ticket", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${emp1Ticket._id}/comments`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "I rebooted the machine and the issue is still present." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].message).toBe(
        "I rebooted the machine and the issue is still present."
      );
      expect(res.body.data.comments[0].author.name).toBe("Employee User");

      // Verify audit trail
      const audit = await AuditLog.findOne({ action: "TICKET_COMMENT" });
      expect(audit).toBeDefined();
      expect(audit.entity).toBe("TICKET");
      expect(audit.entityId).toBe(emp1Ticket._id.toString());
      expect(audit.details).toContain(`Added comment to ticket ${emp1Ticket.ticketCode}`);
    });

    it("IT-M4-41 support can comment on any open ticket", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${emp1Ticket._id}/comments`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ message: "Looking into router configurations now." });

      expect(res.status).toBe(201);
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].author.name).toBe("Support User");
    });

    it("IT-M4-42 admin can comment on any open ticket", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${emp1Ticket._id}/comments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ message: "Priority escalated by system administrator." });

      expect(res.status).toBe(201);
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].author.role).toBe("ADMIN");
    });

    it("IT-M4-43 employee cannot comment on someone else's ticket (returns 403)", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${emp2Ticket._id}/comments`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "Attempting to post on another employee ticket." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Employees can only comment on their own tickets/i);
    });

    it("IT-M4-44 nobody can comment on a CLOSED ticket (returns 400)", async () => {
      // Support attempt
      const resSupport = await request(app)
        .post(`/api/v1/tickets/${closedTicket._id}/comments`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send({ message: "Adding comment to closed ticket." });

      expect(resSupport.status).toBe(400);
      expect(resSupport.body.error.message).toMatch(/Ticket is closed/i);

      // Employee attempt
      const resEmp = await request(app)
        .post(`/api/v1/tickets/${closedTicket._id}/comments`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "Adding comment to closed ticket." });

      expect(resEmp.status).toBe(400);
      expect(resEmp.body.error.message).toMatch(/Ticket is closed/i);
    });

    it("IT-M4-45 rejects empty comment or comment exceeding 1000 characters", async () => {
      const resEmpty = await request(app)
        .post(`/api/v1/tickets/${emp1Ticket._id}/comments`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "" });

      expect(resEmpty.status).toBe(400);

      const resLong = await request(app)
        .post(`/api/v1/tickets/${emp1Ticket._id}/comments`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "a".repeat(1001) });

      expect(resLong.status).toBe(400);
    });
  });
});
