// Purpose: Generates visual PNG thumbnail previews of report pages for layout inspection
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const BUILD_DIR = path.resolve(ROOT_DIR, "docs/build");
const CONTENT_DIR = path.resolve(BUILD_DIR, "content");
const STYLES_DIR = path.resolve(BUILD_DIR, "styles");
const PREVIEW_DIR = path.resolve(ROOT_DIR, "docs/output/preview");
const MANIFEST_PATH = path.resolve(BUILD_DIR, "manifest.json");

async function main() {
  console.log("==================================================");
  console.log("       VICAIT SOP PAGE THUMBNAILS PREVIEW         ");
  console.log("==================================================");

  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const cssContent = fs.readFileSync(path.resolve(STYLES_DIR, "report.css"), "utf8");

  // Read all content files combined
  let combinedHtml = "";
  for (const item of manifest) {
    const filePath = path.resolve(CONTENT_DIR, item.file);
    if (fs.existsSync(filePath)) {
      combinedHtml += fs.readFileSync(filePath, "utf8") + "\n";
    }
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>${cssContent}</style>
    </head>
    <body style="background: #e2e8f0; padding: 20px 0;">
      ${combinedHtml}
    </body>
    </html>
  `;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle" });

  const pageElements = await page.locator(".page").all();
  console.log(`Found ${pageElements.length} pages to preview.\n`);

  // Key inspection pages: 1, 2, 6, 13, 20, 30, 40, 50 (and any others)
  for (let i = 0; i < pageElements.length; i++) {
    const pageNum = i + 1;
    const padded = String(pageNum).padStart(2, "0");
    const outPath = path.resolve(PREVIEW_DIR, `page_${padded}.png`);
    await pageElements[i].screenshot({ path: outPath });
    if ([1, 2, 6, 13, 20, 30, 40, 50].includes(pageNum)) {
      console.log(`  ✓ Captured Key Page ${padded}: ${outPath}`);
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(`All thumbnails saved to ${PREVIEW_DIR}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Preview generation failed:", err);
  process.exit(1);
});
