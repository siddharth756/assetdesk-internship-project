// Purpose: Scheduled cron job checking expiring licenses and sending alerts
const cron = require("node-cron");
const { License, User, AuditLog } = require("../models");
const mailService = require("../services/mailService");
const { daysBetween } = require("../utils/dates");

/**
 * Checks all licenses against the specified date and triggers alerts if expiring or expired
 * @param {Date} [today=new Date()]
 * @returns {Promise<Array<Object>>} List of alerts generated
 */
async function runLicenseExpiryCheck(today = new Date()) {
  const checkDate = new Date(today);
  const dayStart = new Date(checkDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(checkDate);
  dayEnd.setHours(23, 59, 59, 999);

  const adminUsers = await User.find({ role: "ADMIN", isActive: true });
  const adminEmails = adminUsers.map((u) => u.email).filter(Boolean);

  const licenses = await License.find({ expiryDate: { $ne: null } });
  const alertsGenerated = [];

  for (const license of licenses) {
    const daysLeft = daysBetween(checkDate, license.expiryDate);

    // Rule: alert when daysLeft is exactly 30, 15, 7 or the license expired today (daysLeft <= 0)
    const shouldAlert = daysLeft === 30 || daysLeft === 15 || daysLeft === 7 || daysLeft <= 0;
    if (!shouldAlert) {
      continue;
    }

    // Check if an alert was already logged today for this license (no duplicates for same license + day)
    const existingAlert = await AuditLog.findOne({
      action: "LICENSE_EXPIRY_ALERT",
      entity: "LICENSE",
      entityId: license._id.toString(),
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });

    if (existingAlert) {
      continue;
    }

    let alertDescription = "";
    if (daysLeft > 0) {
      alertDescription = `License "${license.softwareName}" expires in ${daysLeft} days`;
    } else if (daysLeft === 0) {
      alertDescription = `License "${license.softwareName}" expired today`;
    } else {
      alertDescription = `License "${license.softwareName}" expired (${Math.abs(daysLeft)} days ago)`;
    }

    // Write immutable AuditLog row
    await AuditLog.create({
      user: null,
      userName: "System",
      action: "LICENSE_EXPIRY_ALERT",
      entity: "LICENSE",
      entityId: license._id.toString(),
      details: alertDescription.substring(0, 300),
      ip: "127.0.0.1",
      createdAt: checkDate
    });

    // Send notification email to all active ADMIN users
    if (adminEmails.length > 0) {
      const formattedDate = new Date(license.expiryDate).toISOString().slice(0, 10);
      const timeRemainingText =
        daysLeft > 0
          ? `${daysLeft} days remaining`
          : daysLeft === 0
            ? "expired today"
            : `expired ${Math.abs(daysLeft)} days ago`;

      const subject = `License Expiry Alert: ${license.softwareName}`;
      const text = `License alert: "${license.softwareName}" (${license.vendor || "No vendor"}) expires on ${formattedDate} (${timeRemainingText}). Total seats: ${license.totalSeats}, Allocated: ${license.allocations ? license.allocations.length : 0}.`;

      await mailService.sendMail({
        to: adminEmails,
        subject,
        text
      });
    }

    alertsGenerated.push({
      licenseId: license._id.toString(),
      softwareName: license.softwareName,
      daysLeft,
      expiryDate: license.expiryDate,
      recipients: adminEmails
    });
  }

  return alertsGenerated;
}

/**
 * Initializes and schedules the license expiry background cron job (runs daily at 08:00)
 * Also triggers one initial check on server start
 * @returns {Object|null} Cron scheduled task or null in test mode
 */
function startLicenseExpiryJob() {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  // Run once at server start
  runLicenseExpiryCheck().catch((err) => {
    console.error("Initial license expiry check failed:", err.message);
  });

  // Schedule daily cron job at 08:00 AM
  const task = cron.schedule("0 8 * * *", async () => {
    try {
      await runLicenseExpiryCheck();
    } catch (err) {
      console.error("Scheduled license expiry cron job failed:", err.message);
    }
  });

  return task;
}

module.exports = {
  runLicenseExpiryCheck,
  startLicenseExpiryJob
};
