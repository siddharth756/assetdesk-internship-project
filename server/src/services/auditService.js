// Purpose: Service for creating immutable audit log entries
const { AuditLog } = require("../models");

/**
 * Log an audit entry into the immutable AuditLog collection
 * @param {Object} options
 * @param {Object} [options.req] - Express request object (optional)
 * @param {Object} [options.user] - User document or object with _id, name, email (optional)
 * @param {string} [options.userName] - Snapshot of the user name performing the action
 * @param {string} options.action - Audit action enum
 * @param {string} options.entity - Audit entity enum
 * @param {string} [options.entityId] - Target entity identifier
 * @param {string} [options.details] - Description of the action (up to 300 chars)
 * @param {string} [options.ip] - IP address of the client
 * @returns {Promise<Object|null>}
 */
async function logAudit({ req, user, userName, action, entity, entityId, details, ip }) {
  try {
    const resolvedUser = user || (req && req.user);
    const resolvedUserId = resolvedUser ? resolvedUser._id || resolvedUser.id : null;
    const resolvedUserName =
      userName ||
      (resolvedUser && (resolvedUser.name || resolvedUser.email)) ||
      (req && req.body && typeof req.body.email === "string" ? req.body.email : "System");

    let resolvedIp = ip;
    if (!resolvedIp && req) {
      resolvedIp =
        req.ip ||
        (req.headers && req.headers["x-forwarded-for"]) ||
        (req.socket && req.socket.remoteAddress) ||
        "";
    }

    const auditEntry = await AuditLog.create({
      user: resolvedUserId,
      userName: resolvedUserName,
      action,
      entity,
      entityId: entityId ? String(entityId) : "",
      details: details ? String(details).substring(0, 300) : "",
      ip: resolvedIp ? String(resolvedIp).substring(0, 100) : ""
    });

    return auditEntry;
  } catch (error) {
    console.error("Audit log creation error:", error.message);
    return null;
  }
}

module.exports = {
  logAudit
};
