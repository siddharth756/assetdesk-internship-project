// Purpose: Global setup for Playwright test suite that resets database using seed script
const { execSync } = require("child_process");
const path = require("path");

module.exports = async function globalSetup() {
  const serverDir = path.resolve(__dirname, "../server");
  console.log("\n[Playwright Global Setup] Resetting and seeding database...");
  execSync("npm run seed", { cwd: serverDir, stdio: "inherit" });
  console.log("[Playwright Global Setup] Seed complete.\n");
};
