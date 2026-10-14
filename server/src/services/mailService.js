// Purpose: Mail service with nodemailer and console fallback for notifications
const nodemailer = require("nodemailer");
const config = require("../config/env");

let transporter = null;

if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });
  } catch (err) {
    console.error("Failed to initialize SMTP transporter:", err.message);
    transporter = null;
  }
}

/**
 * Send an email via SMTP or simulate to console
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {string} [options.body] - Body fallback
 * @returns {Promise<{ success: boolean, simulated?: boolean, messageId?: string, error?: string }>}
 */
async function sendMail({ to, subject, text, html, body }) {
  try {
    const recipients = Array.isArray(to) ? to.join(", ") : String(to || "");
    const emailBody = text || body || html || "";

    if (!transporter) {
      console.log(`[MAIL-SIMULATED] to: ${recipients} | subject: ${subject} | body: ${emailBody}`);
      return {
        success: true,
        simulated: true,
        to: recipients,
        subject
      };
    }

    const mailOptions = {
      from: config.MAIL_FROM || "assetdesk@example.local",
      to: recipients,
      subject,
      text: text || body || "",
      html: html || undefined
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendMail,
  getTransporter: () => transporter
};
