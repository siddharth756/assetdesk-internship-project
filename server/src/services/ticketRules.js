// Purpose: SLA calculation, overdue checks, and status transition business rules (Module M4)
const { addHours } = require("../utils/dates");

// SLA due hours per priority (Contract section 5: CRITICAL 4h, HIGH 24h, MEDIUM 48h, LOW 72h)
const PRIORITY_HOURS = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72
};

// Valid status transitions per Contract section 7 Rule 5:
// OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED, and RESOLVED -> IN_PROGRESS (reopen)
const VALID_TRANSITIONS = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: []
};

/**
 * Checks if status transition from -> to is valid per business rules
 * @param {string} from - Source status
 * @param {string} to - Target status
 * @returns {boolean}
 */
function canTransition(from, to) {
  if (!from || !to) return false;
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Computes SLA due date based on ticket priority and creation timestamp
 * @param {string} priority - Priority level (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {Date|string|number} [createdAt=new Date()] - Ticket creation timestamp
 * @returns {Date}
 */
function computeDueAt(priority, createdAt = new Date()) {
  const hours = PRIORITY_HOURS[priority] || PRIORITY_HOURS.MEDIUM;
  return addHours(new Date(createdAt), hours);
}

/**
 * Determines whether a ticket is overdue:
 * Overdue = status is not RESOLVED or CLOSED, and current time > dueAt
 * @param {Object} ticket - Ticket document or object with status and dueAt
 * @param {Date|string|number} [now=new Date()] - Reference time
 * @returns {boolean}
 */
function isOverdue(ticket, now = new Date()) {
  if (!ticket || !ticket.dueAt) return false;
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return false;
  const currentTime = new Date(now).getTime();
  const dueTime = new Date(ticket.dueAt).getTime();
  return currentTime > dueTime;
}

module.exports = {
  PRIORITY_HOURS,
  VALID_TRANSITIONS,
  canTransition,
  computeDueAt,
  isOverdue
};
