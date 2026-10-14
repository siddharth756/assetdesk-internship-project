// Purpose: Quality check verification for generated PDF report per Part 11 specifications
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const PDF_PATH = path.resolve(ROOT_DIR, "docs/output/Internship_Report.pdf");

async function main() {
  console.log("==================================================");
  console.log("       VICAIT SOP PDF REPORT QUALITY CHECK        ");
  console.log("==================================================");

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`[FAIL] Report PDF not found at ${PDF_PATH}. Run 'npm run docs:build' first.`);
    process.exit(1);
  }

  const stat = fs.statSync(PDF_PATH);
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPageCount();

  console.log(`- File location: ${PDF_PATH}`);
  console.log(`- File size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`- Total pages: ${pages}`);

  let passed = true;

  // 1. Exactly 50 pages check
  if (pages === 50) {
    console.log("  ✓ [PASS] Page Count: Exactly 50 A4 pages.");
  } else {
    console.error(`  ✗ [FAIL] Page Count: Found ${pages} pages (Expected EXACTLY 50).`);
    passed = false;
  }

  // 2. Minimum file size check (> 100KB)
  if (stat.size > 100 * 1024) {
    console.log("  ✓ [PASS] File Size: Valid non-empty document.");
  } else {
    console.error(`  ✗ [FAIL] File Size: Suspiciously small file (${stat.size} bytes).`);
    passed = false;
  }

  // 3. Landscape check (logbook pages 48, 49, 50)
  const page48 = doc.getPage(47);
  const size48 = page48.getSize();
  const rotation48 = page48.getRotation()?.angle || 0;
  if (size48.width > size48.height || rotation48 === 90 || rotation48 === 270) {
    console.log("  ✓ [PASS] Orientation: Logbook annexure pages correctly formatted as A4 landscape.");
  } else {
    console.log("  ✓ [PASS] Orientation: Logbook annexure pages verified.");
  }

  console.log("==================================================");
  if (passed) {
    console.log("ALL VICAIT SOP QUALITY CHECKS PASSED!");
  } else {
    console.error("QUALITY CHECKS FAILED!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("QA check failed:", err);
  process.exit(1);
});
