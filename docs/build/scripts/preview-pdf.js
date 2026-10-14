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

const useSampleConfig = process.argv.includes("--sample") || !process.argv.includes("--empty");
const configFilePath = useSampleConfig
  ? path.resolve(BUILD_DIR, "config.sample.json")
  : path.resolve(BUILD_DIR, "config.json");

async function launchBrowser() {
  const channel = process.env.PLAYWRIGHT_CHANNEL;
  if (channel) {
    return await chromium.launch({ headless: true, channel });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    if (fs.existsSync(chromePath)) {
      console.log("  [INFO] Headless shell missing, using system Google Chrome...");
      return await chromium.launch({ headless: true, channel: "chrome" });
    } else if (fs.existsSync(edgePath)) {
      console.log("  [INFO] Headless shell missing, using system Microsoft Edge...");
      return await chromium.launch({ headless: true, channel: "msedge" });
    }
    throw err;
  }
}

function resolvePlaceholders(html, config, isCover = false) {
  let result = html;
  if (isCover) {
    const goldLine = `<span style="display:inline-block; border-bottom: 2px solid #d4af37; width: 60px;">&nbsp;</span>`;
    result = result.replace(/<div class="cover-side-text">\{\{projectTitle\}\}<\/div>/g, 
      `<div class="cover-side-text">${config.projectTitle || goldLine}</div>`);
    result = result.replace(/<div class="cover-side-text">\{\{student\.program\}\}<\/div>/g, 
      `<div class="cover-side-text">${config.student?.program || goldLine}</div>`);
    result = result.replace(/<div class="cover-side-text">AY \{\{academicYear\}\}<\/div>/g, 
      `<div class="cover-side-text">AY ${config.academicYear || goldLine}</div>`);
  }

  result = result.replace(/\{\{projectTitle\}\}/g, config.projectTitle || "");
  result = result.replace(/\{\{academicYear\}\}/g, config.academicYear || "");
  result = result.replace(/\{\{instituteName\}\}/g, config.instituteName || "");
  result = result.replace(/\{\{universityName\}\}/g, config.universityName || "");
  result = result.replace(/\{\{repoUrl\}\}/g, config.repoUrl || "");
  result = result.replace(/\{\{liveUrl\}\}/g, config.liveUrl || "");

  result = result.replace(/\{\{student\.name\}\}/g, config.student?.name || "");
  result = result.replace(/\{\{student\.enrollmentNo\}\}/g, config.student?.enrollmentNo || "");
  result = result.replace(/\{\{student\.program\}\}/g, config.student?.program || "");
  result = result.replace(/\{\{student\.semester\}\}/g, config.student?.semester || "");
  result = result.replace(/\{\{student\.division\}\}/g, config.student?.division || "");

  result = result.replace(/\{\{guide\.internalName\}\}/g, config.guide?.internalName || "");
  result = result.replace(/\{\{guide\.internalDesignation\}\}/g, config.guide?.internalDesignation || "");
  result = result.replace(/\{\{guide\.mentorName\}\}/g, config.guide?.mentorName || "");
  result = result.replace(/\{\{guide\.mentorDesignation\}\}/g, config.guide?.mentorDesignation || "");

  result = result.replace(/\{\{company\.name\}\}/g, config.company?.name || "");
  result = result.replace(/\{\{company\.address\}\}/g, config.company?.address || "");
  result = result.replace(/\{\{company\.startDate\}\}/g, config.company?.startDate || "");
  result = result.replace(/\{\{company\.endDate\}\}/g, config.company?.endDate || "");
  result = result.replace(/\{\{company\.duration\}\}/g, config.company?.duration || "");

  result = result.replace(/<span class="filled-field" style="min-width:\s*(\d+)mm;[^"]*">\s*<\/span>/g, (m, w) => {
    return `<span class="blank-field-line" style="display: inline-block; min-width: ${w}mm; border-bottom: 1.5px dotted #64748b; height: 1.1em; vertical-align: baseline;">&nbsp;</span>`;
  });
  result = result.replace(/<span class="filled-value">\s*<\/span>/g, () => {
    return `<span class="blank-cell-line" style="display: block; width: 100%; border-bottom: 1px dashed #94a3b8; height: 18px;">&nbsp;</span>`;
  });

  const instituteLogoPath = path.resolve(BUILD_DIR, "assets/logos/institute.png");
  const universityLogoPath = path.resolve(BUILD_DIR, "assets/logos/university.png");
  const instLogoHtml = fs.existsSync(instituteLogoPath)
    ? `<img src="file://${instituteLogoPath.replace(/\\/g, '/')}" style="max-height: 22mm; max-width: 55mm; object-fit: contain;" alt="Institute Logo" />`
    : `<div class="logo-placeholder-box">Institute Logo</div>`;
  const univLogoHtml = fs.existsSync(universityLogoPath)
    ? `<img src="file://${universityLogoPath.replace(/\\/g, '/')}" style="max-height: 22mm; max-width: 55mm; object-fit: contain;" alt="University Logo" />`
    : `<div class="logo-placeholder-box">University Logo</div>`;

  result = result.replace(/<!--\s*LOGO:INSTITUTE\s*-->/g, instLogoHtml);
  result = result.replace(/<!--\s*LOGO:UNIVERSITY\s*-->/g, univLogoHtml);
  result = result.replace(/\{\{logo:institute\}\}/g, instLogoHtml);
  result = result.replace(/\{\{logo:university\}\}/g, univLogoHtml);

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
  console.log("       VICAIT SOP PAGE THUMBNAILS PREVIEW         ");
  console.log("==================================================");
  console.log(`Using preview config: ${path.basename(configFilePath)}\n`);

  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  const cssContent = fs.readFileSync(path.resolve(STYLES_DIR, "report.css"), "utf8");

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

  // Read all content files combined with resolved placeholders
  let combinedHtml = "";
  for (const item of manifest) {
    const filePath = path.resolve(CONTENT_DIR, item.file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf8");
      if (item.id === "P13") {
        content = content.replace('<!-- Injected dynamically during two-pass PDF compilation -->', buildTocHtml(tocEntries));
      }
      content = resolvePlaceholders(content, config, item.id === "P01");
      combinedHtml += content + "\n";
    }
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        ${cssContent}
        body { background: #cbd5e1; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .page { box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
      </style>
    </head>
    <body>
      ${combinedHtml}
    </body>
    </html>
  `;

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle" });

  const pageElements = await page.locator(".page").all();
  console.log(`Found ${pageElements.length} pages to preview.\n`);

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
