// Purpose: Unit tests for dates utility functions
const { startOfToday, daysBetween, addDays, addHours } = require("../../src/utils/dates");

describe("Dates Utility Unit Tests", () => {
  it("startOfToday should return a date with zeroed hours, minutes, seconds, ms", () => {
    const today = startOfToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });

  it("daysBetween should calculate difference in calendar days", () => {
    const d1 = new Date("2026-01-01T10:00:00Z");
    const d2 = new Date("2026-01-11T15:00:00Z");
    expect(daysBetween(d1, d2)).toBe(10);
  });

  it("addDays should accurately add days to date", () => {
    const start = new Date("2026-05-01T00:00:00.000Z");
    const result = addDays(start, 5);
    expect(result.getDate()).toBe(6);
  });

  it("addHours should accurately add hours to date", () => {
    const start = new Date("2026-05-01T10:00:00.000Z");
    const result = addHours(start, 4);
    expect(result.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000);
  });
});
