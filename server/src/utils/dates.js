// Purpose: Date utility helpers for SLA calculations, license expiry, and calendar days

/**
 * Returns a new Date set to the start of the current day (00:00:00.000)
 * @returns {Date}
 */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates calendar days between two dates (d2 - d1)
 * @param {Date|string|number} d1
 * @param {Date|string|number} d2
 * @returns {number}
 */
function daysBetween(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);
  const diffMs = date2.getTime() - date1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds specified number of days to a date
 * @param {Date|string|number} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds specified number of hours to a date
 * @param {Date|string|number} date
 * @param {number} hours
 * @returns {Date}
 */
function addHours(date, hours) {
  const result = new Date(date);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

module.exports = {
  startOfToday,
  daysBetween,
  addDays,
  addHours
};
