// Purpose: Safe audit logging helper for controllers and middleware
const { logAudit } = require("../services/auditService");

/**
 * Safely log an audit action without throwing or disrupting request execution
 * @param {Object} params - Audit parameters
 * @returns {Promise<Object|null>}
 */
async function safeAudit(params) {
  try {
    return await logAudit(params);
  } catch (error) {
    console.error("Safe audit helper caught error:", error.message);
    return null;
  }
}

module.exports = {
  safeAudit,
  logAudit: safeAudit
};
