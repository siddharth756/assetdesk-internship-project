// Purpose: Automated diagram renderer converting Mermaid .mmd sources to both high-res PNG (2x scale) and SVG
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIAGRAMS_DIR = path.resolve(__dirname, "../../assets/diagrams");

async function main() {
  console.log("==================================================");
  console.log("       ASSETDESK MERMAID DIAGRAM RENDERER         ");
  console.log("==================================================");

  const files = fs.readdirSync(DIAGRAMS_DIR).filter((f) => f.endsWith(".mmd")).sort();
  console.log(`Found ${files.length} diagram source files in ${DIAGRAMS_DIR}\n`);

  for (const file of files) {
    const baseName = path.basename(file, ".mmd");
    const inputPath = path.resolve(DIAGRAMS_DIR, file);
    const svgPath = path.resolve(DIAGRAMS_DIR, `${baseName}.svg`);
    const pngPath = path.resolve(DIAGRAMS_DIR, `${baseName}.png`);

    console.log(`[Rendering] ${baseName}...`);

    try {
      // 1. Render SVG
      execSync(
        `npx @mermaid-js/mermaid-cli -i "${inputPath}" -o "${svgPath}" -b white -t neutral`,
        { stdio: "ignore" }
      );
      // 2. Render PNG at 2x scale
      execSync(
        `npx @mermaid-js/mermaid-cli -i "${inputPath}" -o "${pngPath}" -s 2 -b white -t neutral`,
        { stdio: "ignore" }
      );
      console.log(`  ✓ SVG: ${baseName}.svg`);
      console.log(`  ✓ PNG: ${baseName}.png (2x scale)`);
    } catch (err) {
      console.error(`  ✗ Error rendering ${baseName}:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("All diagrams rendered successfully!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Diagram rendering process failed:", err);
  process.exit(1);
});
