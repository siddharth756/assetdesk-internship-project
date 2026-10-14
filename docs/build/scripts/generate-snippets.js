// Purpose: Programmatically extract verified code snippets from repository source files for internship report
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const DATA_DIR = path.resolve(ROOT_DIR, "docs/build/data");

function extractLines(relPath, startLine, endLine) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split("\n");
  // 1-indexed slice
  const selected = lines.slice(startLine - 1, endLine);
  return selected.join("\n");
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const snippets = [
    {
      title: "JWT Authentication Middleware",
      file: "server/src/middleware/auth.js",
      startLine: 11,
      endLine: 30,
      code: extractLines("server/src/middleware/auth.js", 11, 30)
    },
    {
      title: "Atomic Asset Assignment with Concurrency Guard",
      file: "server/src/controllers/assets.js",
      startLine: 256,
      endLine: 281,
      code: extractLines("server/src/controllers/assets.js", 256, 281)
    },
    {
      title: "Ticket Status Transition State Machine Rules",
      file: "server/src/services/ticketRules.js",
      startLine: 14,
      endLine: 33,
      code: extractLines("server/src/services/ticketRules.js", 14, 33)
    },
    {
      title: "Software License Expiry & Status Computation",
      file: "server/src/models/License.js",
      startLine: 90,
      endLine: 104,
      code: extractLines("server/src/models/License.js", 90, 104)
    }
  ];

  const outputPath = path.resolve(DATA_DIR, "snippets.json");
  fs.writeFileSync(outputPath, JSON.stringify(snippets, null, 2), "utf8");
  console.log(`[Snippets] Successfully extracted ${snippets.length} snippets to ${outputPath}`);
}

main();
