// Purpose: Unit tests for ticket business rules (Module M4 SLA calculation, overdue logic, and status transitions)
const {
  PRIORITY_HOURS,
  VALID_TRANSITIONS,
  canTransition,
  computeDueAt,
  isOverdue
} = require("../../src/services/ticketRules");

describe("Ticket Rules Unit Tests (Module M4)", () => {
  describe("canTransition", () => {
    it("UT-31 should allow OPEN -> IN_PROGRESS transition", () => {
      expect(canTransition("OPEN", "IN_PROGRESS")).toBe(true);
    });

    it("UT-32 should allow IN_PROGRESS -> RESOLVED transition", () => {
      expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    });

    it("UT-33 should allow RESOLVED -> CLOSED transition", () => {
      expect(canTransition("RESOLVED", "CLOSED")).toBe(true);
    });

    it("UT-34 should allow RESOLVED -> IN_PROGRESS transition (ticket reopen)", () => {
      expect(canTransition("RESOLVED", "IN_PROGRESS")).toBe(true);
    });

    it("UT-35 should disallow direct transition from OPEN to RESOLVED", () => {
      expect(canTransition("OPEN", "RESOLVED")).toBe(false);
    });

    it("UT-36 should disallow direct transition from OPEN to CLOSED", () => {
      expect(canTransition("OPEN", "CLOSED")).toBe(false);
    });

    it("UT-37 should disallow skipping RESOLVED: IN_PROGRESS to CLOSED is invalid", () => {
      expect(canTransition("IN_PROGRESS", "CLOSED")).toBe(false);
    });

    it("UT-38 should disallow backwards transition from IN_PROGRESS to OPEN", () => {
      expect(canTransition("IN_PROGRESS", "OPEN")).toBe(false);
    });

    it("UT-39 should disallow backwards transition from RESOLVED to OPEN", () => {
      expect(canTransition("RESOLVED", "OPEN")).toBe(false);
    });

    it("UT-40 should disallow any transition out of CLOSED status", () => {
      expect(canTransition("CLOSED", "OPEN")).toBe(false);
      expect(canTransition("CLOSED", "IN_PROGRESS")).toBe(false);
      expect(canTransition("CLOSED", "RESOLVED")).toBe(false);
      expect(canTransition("CLOSED", "CLOSED")).toBe(false);
    });

    it("UT-41 should return false when target status is identical to current status", () => {
      expect(canTransition("OPEN", "OPEN")).toBe(false);
      expect(canTransition("IN_PROGRESS", "IN_PROGRESS")).toBe(false);
      expect(canTransition("RESOLVED", "RESOLVED")).toBe(false);
    });

    it("UT-42 should return false for invalid, null, or undefined status inputs", () => {
      expect(canTransition(null, "IN_PROGRESS")).toBe(false);
      expect(canTransition("OPEN", null)).toBe(false);
      expect(canTransition(undefined, undefined)).toBe(false);
      expect(canTransition("UNKNOWN_STATUS", "IN_PROGRESS")).toBe(false);
      expect(canTransition("OPEN", "UNKNOWN_STATUS")).toBe(false);
    });
  });

  describe("computeDueAt", () => {
    const baseTime = new Date("2026-05-01T10:00:00.000Z");

    it("UT-43 should compute 4 hours SLA for CRITICAL priority", () => {
      const dueAt = computeDueAt("CRITICAL", baseTime);
      const diffMs = dueAt.getTime() - baseTime.getTime();
      expect(diffMs).toBe(4 * 60 * 60 * 1000);
      expect(dueAt.toISOString()).toBe("2026-05-01T14:00:00.000Z");
    });

    it("UT-44 should compute 24 hours SLA for HIGH priority", () => {
      const dueAt = computeDueAt("HIGH", baseTime);
      const diffMs = dueAt.getTime() - baseTime.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
      expect(dueAt.toISOString()).toBe("2026-05-02T10:00:00.000Z");
    });

    it("UT-45 should compute 48 hours SLA for MEDIUM priority", () => {
      const dueAt = computeDueAt("MEDIUM", baseTime);
      const diffMs = dueAt.getTime() - baseTime.getTime();
      expect(diffMs).toBe(48 * 60 * 60 * 1000);
      expect(dueAt.toISOString()).toBe("2026-05-03T10:00:00.000Z");
    });

    it("UT-46 should compute 72 hours SLA for LOW priority", () => {
      const dueAt = computeDueAt("LOW", baseTime);
      const diffMs = dueAt.getTime() - baseTime.getTime();
      expect(diffMs).toBe(72 * 60 * 60 * 1000);
      expect(dueAt.toISOString()).toBe("2026-05-04T10:00:00.000Z");
    });

    it("UT-47 should default to 48 hours SLA when priority is omitted or invalid", () => {
      const dueAtDefault = computeDueAt(undefined, baseTime);
      expect(dueAtDefault.getTime() - baseTime.getTime()).toBe(48 * 60 * 60 * 1000);

      const dueAtInvalid = computeDueAt("NON_EXISTENT", baseTime);
      expect(dueAtInvalid.getTime() - baseTime.getTime()).toBe(48 * 60 * 60 * 1000);
    });

    it("UT-48 should use current timestamp when createdAt is not provided", () => {
      const before = Date.now();
      const dueAt = computeDueAt("HIGH");
      const after = Date.now();

      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;
      expect(dueAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(dueAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("isOverdue", () => {
    const referenceNow = new Date("2026-05-01T12:00:00.000Z");
    const pastDue = new Date("2026-05-01T10:00:00.000Z");
    const futureDue = new Date("2026-05-01T14:00:00.000Z");

    it("UT-49 should return true when ticket is OPEN and now is past dueAt", () => {
      const ticket = { status: "OPEN", dueAt: pastDue };
      expect(isOverdue(ticket, referenceNow)).toBe(true);
    });

    it("UT-50 should return true when ticket is IN_PROGRESS and now is past dueAt", () => {
      const ticket = { status: "IN_PROGRESS", dueAt: pastDue };
      expect(isOverdue(ticket, referenceNow)).toBe(true);
    });

    it("UT-51 should return false when ticket is OPEN but dueAt is in the future", () => {
      const ticket = { status: "OPEN", dueAt: futureDue };
      expect(isOverdue(ticket, referenceNow)).toBe(false);
    });

    it("UT-52 should return false when ticket is IN_PROGRESS but dueAt is in the future", () => {
      const ticket = { status: "IN_PROGRESS", dueAt: futureDue };
      expect(isOverdue(ticket, referenceNow)).toBe(false);
    });

    it("UT-53 should return false when ticket is RESOLVED even if current time is past dueAt", () => {
      const ticket = { status: "RESOLVED", dueAt: pastDue };
      expect(isOverdue(ticket, referenceNow)).toBe(false);
    });

    it("UT-54 should return false when ticket is CLOSED even if current time is past dueAt", () => {
      const ticket = { status: "CLOSED", dueAt: pastDue };
      expect(isOverdue(ticket, referenceNow)).toBe(false);
    });

    it("UT-55 should return false for missing ticket or missing dueAt", () => {
      expect(isOverdue(null, referenceNow)).toBe(false);
      expect(isOverdue({}, referenceNow)).toBe(false);
      expect(isOverdue({ status: "OPEN", dueAt: null }, referenceNow)).toBe(false);
    });
  });

  describe("Constants verification", () => {
    it("UT-56 should match Contract section 5 SLA priority definitions", () => {
      expect(PRIORITY_HOURS.CRITICAL).toBe(4);
      expect(PRIORITY_HOURS.HIGH).toBe(24);
      expect(PRIORITY_HOURS.MEDIUM).toBe(48);
      expect(PRIORITY_HOURS.LOW).toBe(72);
    });

    it("UT-57 should define transitions matching Contract section 7 Rule 5", () => {
      expect(VALID_TRANSITIONS.OPEN).toEqual(["IN_PROGRESS"]);
      expect(VALID_TRANSITIONS.IN_PROGRESS).toEqual(["RESOLVED"]);
      expect(VALID_TRANSITIONS.RESOLVED).toEqual(["IN_PROGRESS", "CLOSED"]);
      expect(VALID_TRANSITIONS.CLOSED).toEqual([]);
    });
  });
});
