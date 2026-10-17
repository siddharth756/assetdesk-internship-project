// Purpose: Automated diagram renderer using Playwright and Mermaid.js CDN
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const DIAGRAMS_DIR = path.resolve(ROOT_DIR, "docs/assets/diagrams");

async function launchBrowser() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (fs.existsSync(chromePath)) {
    return await chromium.launch({ headless: true, channel: "chrome" });
  } else if (fs.existsSync(edgePath)) {
    return await chromium.launch({ headless: true, channel: "msedge" });
  }
  return await chromium.launch({ headless: true });
}

async function renderDiagram(page, mmdSource, outPngPath, outSvgPath) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 20px;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Calibri, sans-serif;
        }
        #container {
          display: inline-block;
          background: #ffffff;
        }
        .node text, .node .label, .nodeLabel {
          font-size: 19px !important;
          font-weight: 600 !important;
        }
        .edgeLabel, .edgeLabel span {
          font-size: 16px !important;
          font-weight: 600 !important;
          background: #ffffff !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
        }
        .cluster-label text, .cluster .label, .clusterLabel {
          font-size: 20px !important;
          font-weight: 700 !important;
          fill: #1e3a8a !important;
        }
        .classGroup text, .classGroup .label {
          font-size: 18px !important;
          font-weight: 500 !important;
        }
        .classGroup .title {
          font-size: 20px !important;
          font-weight: 700 !important;
        }
        .stateGroup text, .stateGroup .label {
          font-size: 18px !important;
          font-weight: 600 !important;
        }
        .er.entityLabel, .er.entityLabel text {
          font-size: 19px !important;
          font-weight: 700 !important;
        }
        .er.relationshipLabel, .er.relationshipLabel text {
          font-size: 16px !important;
          font-weight: 600 !important;
        }
        .er.attributeBoxOdd text, .er.attributeBoxEven text {
          font-size: 16px !important;
          font-weight: 500 !important;
        }
      </style>
    </head>
    <body>
      <div id="container" class="mermaid">
${mmdSource}
      </div>
      <script>
        mermaid.initialize({
          startOnLoad: true,
          theme: 'neutral',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis',
            nodeSpacing: 35,
            rankSpacing: 40
          },
          themeVariables: {
            fontSize: '18px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Calibri, sans-serif',
            primaryColor: '#f8fafc',
            primaryBorderColor: '#3b82f6',
            primaryTextColor: '#0f172a',
            lineColor: '#334155',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#ffffff'
          }
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForSelector("#container svg", { timeout: 15000 });

  const svgElement = page.locator("#container svg");
  const svgHtml = await svgElement.evaluate(el => el.outerHTML);
  if (outSvgPath) {
    fs.writeFileSync(outSvgPath, svgHtml, "utf8");
  }

  // Screenshot tightly cropped to the SVG itself (removes all surrounding viewport whitespace)
  await svgElement.screenshot({ path: outPngPath, type: "png" });
}

async function main() {
  console.log("==================================================");
  console.log("   PLAYWRIGHT HIGH-RESOLUTION MERMAID RENDERER    ");
  console.log("==================================================");

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 2800, height: 1800 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const files = fs.readdirSync(DIAGRAMS_DIR).filter(f => f.endsWith(".mmd")).sort();
  console.log(`Found ${files.length} diagrams to render in ${DIAGRAMS_DIR}\n`);

  for (const file of files) {
    const baseName = path.basename(file, ".mmd");
    const mmdPath = path.resolve(DIAGRAMS_DIR, file);
    const pngPath = path.resolve(DIAGRAMS_DIR, `${baseName}.png`);
    const svgPath = path.resolve(DIAGRAMS_DIR, `${baseName}.svg`);
    const mmdSource = fs.readFileSync(mmdPath, "utf8");

    try {
      console.log(`Rendering ${baseName}...`);
      await renderDiagram(page, mmdSource, pngPath, svgPath);
      console.log(`  ✓ Rendered ${baseName}.png & .svg (tight crop)`);
    } catch (err) {
      console.error(`  ✗ Error rendering ${baseName}:`, err.message);
    }
  }

  await browser.close();
  console.log("\nAll diagrams successfully rendered!");
}

main().catch(err => {
  console.error("Renderer failed:", err);
  process.exit(1);
});
