// Purpose: VICAIT SOP 50-Page PDF Document Build Engine using Playwright and pdf-lib
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const BUILD_DIR = path.resolve(ROOT_DIR, "docs/build");
const CONTENT_DIR = path.resolve(BUILD_DIR, "content");
const STYLES_DIR = path.resolve(BUILD_DIR, "styles");
const OUTPUT_DIR = path.resolve(ROOT_DIR, "docs/output");
const MANIFEST_PATH = path.resolve(BUILD_DIR, "manifest.json");

// Command-line flag: --sample uses config.sample.json; default is config.json
const useSampleConfig = process.argv.includes("--sample");
const configFilePath = useSampleConfig
  ? path.resolve(BUILD_DIR, "config.sample.json")
  : path.resolve(BUILD_DIR, "config.json");

function loadConfig() {
  const raw = fs.readFileSync(configFilePath, "utf8");
  return JSON.parse(raw);
}

function resolvePlaceholders(html, config) {
  let result = html;
  result = result.replace(/\{\{projectTitle\}\}/g, config.projectTitle || "");
  result = result.replace(/\{\{academicYear\}\}/g, config.academicYear || "");
  result = result.replace(/\{\{instituteName\}\}/g, config.instituteName || "");
  result = result.replace(/\{\{universityName\}\}/g, config.universityName || "");
  result = result.replace(/\{\{repoUrl\}\}/g, config.repoUrl || "");
  result = result.replace(/\{\{liveUrl\}\}/g, config.liveUrl || "");

  // Student
  result = result.replace(/\{\{student\.name\}\}/g, config.student?.name || "");
  result = result.replace(/\{\{student\.enrollmentNo\}\}/g, config.student?.enrollmentNo || "");
  result = result.replace(/\{\{student\.program\}\}/g, config.student?.program || "");
  result = result.replace(/\{\{student\.semester\}\}/g, config.student?.semester || "");
  result = result.replace(/\{\{student\.division\}\}/g, config.student?.division || "");

  // Guide
  result = result.replace(/\{\{guide\.internalName\}\}/g, config.guide?.internalName || "");
  result = result.replace(/\{\{guide\.internalDesignation\}\}/g, config.guide?.internalDesignation || "");
  result = result.replace(/\{\{guide\.mentorName\}\}/g, config.guide?.mentorName || "");
  result = result.replace(/\{\{guide\.mentorDesignation\}\}/g, config.guide?.mentorDesignation || "");

  // Company
  result = result.replace(/\{\{company\.name\}\}/g, config.company?.name || "");
  result = result.replace(/\{\{company\.address\}\}/g, config.company?.address || "");
  result = result.replace(/\{\{company\.startDate\}\}/g, config.company?.startDate || "");
  result = result.replace(/\{\{company\.endDate\}\}/g, config.company?.endDate || "");
  result = result.replace(/\{\{company\.duration\}\}/g, config.company?.duration || "");

  return result;
}

function buildTocHtml(tocItems) {
  let rows = "";
  for (const item of tocItems) {
    const isMajor = item.tocLevel === 1;
    const titleWeight = isMajor ? "font-weight: bold; color: #0f172a;" : "font-weight: normal; color: #334155;";
    const indent = item.tocLevel === 0 ? "0px" : isMajor ? "0px" : "20px";
    rows += `
      <div style="display: flex; align-items: baseline; margin-bottom: 7px; padding-left: ${indent}; font-size: 10.5pt;">
        <span style="${titleWeight}">${item.tocTitle}</span>
        <span style="flex: 1; border-bottom: 1.5px dotted #94a3b8; margin: 0 8px; height: 1em;"></span>
        <span style="font-weight: bold; color: #0f172a; min-width: 25px; text-align: right;">${item.pageNumber}</span>
      </div>
    `;
  }
  return rows;
}

async function main() {
  console.log("==================================================");
  console.log("       ASSETDESK 50-PAGE REPORT BUILD ENGINE      ");
  console.log("==================================================");
  console.log(`Using configuration: ${path.basename(configFilePath)}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const config = loadConfig();
  const cssContent = fs.readFileSync(path.resolve(STYLES_DIR, "report.css"), "utf8");

  // Calculate projected page start numbers for TOC
  let currentPage = 1;
  const tocEntries = [];

  for (const item of manifest) {
    if (item.includeInToc) {
      tocEntries.push({
        id: item.id,
        tocTitle: item.tocTitle,
        tocLevel: item.tocLevel,
        pageNumber: currentPage
      });
    }
    currentPage += item.pageBudget;
  }

  // Launch browser for headless PDF rendering
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const renderedPartPdfs = [];
  const partStats = [];

  console.log("[1/3] Rendering HTML content parts...");

  for (const item of manifest) {
    const partFile = path.resolve(CONTENT_DIR, item.file);
    let htmlContent = fs.readFileSync(partFile, "utf8");

    // Dynamic TOC injection for P13
    if (item.id === "P13") {
      const tocHtml = buildTocHtml(tocEntries);
      htmlContent = htmlContent.replace('<!-- Injected dynamically during two-pass PDF compilation -->', tocHtml);
    }

    // Resolve template variables
    htmlContent = resolvePlaceholders(htmlContent, config);

    // Full HTML document wrapper
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>${cssContent}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const page = await context.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle" });

    const isLandscape = item.orientation === "landscape";
    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      landscape: isLandscape,
      format: "A4",
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    await page.close();

    // Verify page count of generated part using pdf-lib
    const partDoc = await PDFDocument.load(pdfBuffer);
    const actualPages = partDoc.getPageCount();

    renderedPartPdfs.push({
      item,
      pdfDoc: partDoc,
      actualPages
    });

    const isOk = actualPages === item.pageBudget;
    partStats.push({
      id: item.id,
      title: item.tocTitle,
      budget: item.pageBudget,
      actual: actualPages,
      status: isOk ? "OK" : actualPages > item.pageBudget ? "OVER" : "UNDER"
    });
  }

  await browser.close();

  console.log("[2/3] Merging and stamping header/footer rules with pdf-lib...");

  // Combine into single document
  const finalPdf = await PDFDocument.create();
  const fontHelvetica = await finalPdf.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);

  for (const part of renderedPartPdfs) {
    const copiedPages = await finalPdf.copyPages(part.pdfDoc, part.pdfDoc.getPageIndices());
    for (const p of copiedPages) {
      finalPdf.addPage(p);
    }
  }

  const totalPages = finalPdf.getPageCount();

  // Stamp headers and footers on pages 2..50 (Page 1 cover page is excluded)
  for (let idx = 1; idx < totalPages; idx++) {
    const pageNum = idx + 1;
    const page = finalPdf.getPage(idx);
    const { width, height } = page.getSize();
    const isLandscape = width > height;

    const marginX = isLandscape ? 30.48 * 2.83465 : 30.48 * 2.83465; // ~1.2in in points = 86.4pt
    const marginRight = 20.32 * 2.83465; // ~0.8in in points = 57.6pt
    const contentWidth = width - marginX - marginRight;

    // Header position (0.5" from top = height - 36pt)
    const headerY = height - 36;
    const headerRuleY = headerY - 5;

    // Header Text (Left & Right)
    page.drawText("IT Asset & Support Desk Management System", {
      x: marginX,
      y: headerY,
      size: 8.5,
      font: fontHelvetica,
      color: rgb(0.3, 0.35, 0.42)
    });

    const headerRightText = "Internship Report";
    const headerRightWidth = fontHelveticaBold.widthOfTextAtSize(headerRightText, 8.5);
    page.drawText(headerRightText, {
      x: width - marginRight - headerRightWidth,
      y: headerY,
      size: 8.5,
      font: fontHelveticaBold,
      color: rgb(0.2, 0.25, 0.3)
    });

    // Thin rule line below header
    page.drawLine({
      start: { x: marginX, y: headerRuleY },
      end: { x: width - marginRight, y: headerRuleY },
      thickness: 0.5,
      color: rgb(0.8, 0.83, 0.88)
    });

    // Footer position (0.5" from bottom = 36pt)
    const footerY = 32;
    const footerRuleY = footerY + 12;

    // Thin rule line above footer
    page.drawLine({
      start: { x: marginX, y: footerRuleY },
      end: { x: width - marginRight, y: footerRuleY },
      thickness: 0.5,
      color: rgb(0.8, 0.83, 0.88)
    });

    // Footer Text (Left: Institute name, Right: Page | n)
    page.drawText("Vidhyadeep Institute of Computer & Information Technology", {
      x: marginX,
      y: footerY,
      size: 8,
      font: fontHelvetica,
      color: rgb(0.35, 0.4, 0.47)
    });

    const pageText = `Page | ${pageNum}`;
    const pageTextWidth = fontHelveticaBold.widthOfTextAtSize(pageText, 8.5);
    page.drawText(pageText, {
      x: width - marginRight - pageTextWidth,
      y: footerY,
      size: 8.5,
      font: fontHelveticaBold,
      color: rgb(0.15, 0.2, 0.25)
    });
  }

  // Save final PDF
  const finalPdfBytes = await finalPdf.save();
  const outputPath = path.resolve(OUTPUT_DIR, "Internship_Report.pdf");
  fs.writeFileSync(outputPath, finalPdfBytes);

  console.log("[3/3] Assembly complete!");
  console.log(`Target output: ${outputPath} (${(finalPdfBytes.length / (1024 * 1024)).toFixed(2)} MB)\n`);

  // Print Budget vs Actual Table
  console.log("==========================================================================");
  console.log("                    VICAIT SOP PAGE BUDGET REPORT                         ");
  console.log("==========================================================================");
  console.log(
    "Part ID".padEnd(10) +
    "Part Title".padEnd(46) +
    "Budget".padStart(8) +
    "Actual".padStart(8) +
    "Status".padStart(10)
  );
  console.log("--------------------------------------------------------------------------");

  let totalBudget = 0;
  let totalActual = 0;
  let allOk = true;

  for (const s of partStats) {
    totalBudget += s.budget;
    totalActual += s.actual;
    if (s.status !== "OK") allOk = false;

    console.log(
      s.id.padEnd(10) +
      s.title.slice(0, 44).padEnd(46) +
      String(s.budget).padStart(8) +
      String(s.actual).padStart(8) +
      s.status.padStart(10)
    );
  }

  console.log("==========================================================================");
  console.log(
    "TOTAL".padEnd(56) +
    String(totalBudget).padStart(8) +
    String(totalActual).padStart(8) +
    (totalActual === 50 && allOk ? "PERFECT OK" : "MISMATCH").padStart(10)
  );
  console.log("==========================================================================\n");

  if (totalActual !== 50) {
    console.error(`ERROR: Total page count is ${totalActual}, expected EXACTLY 50 pages!`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
