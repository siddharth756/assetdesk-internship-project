// Purpose: Blank-field system helpers for VICAIT SOP Report formatting
// Ensures consistent height whether config values are filled or empty

function field(value, options = {}) {
  const minWidthMm = options.minWidthMm || 60;
  if (value && String(value).trim()) {
    return `<span class="filled-field" style="min-width: ${minWidthMm}mm; font-weight: 600;">${String(value).trim()}</span>`;
  }
  return `<span class="blank-field-line" style="display: inline-block; min-width: ${minWidthMm}mm; border-bottom: 1.5px dotted #64748b; height: 1.1em; vertical-align: baseline;">&nbsp;</span>`;
}

function formTable(rows = []) {
  const renderedRows = rows.map(([label, val, minWidthMm]) => {
    const content = val && String(val).trim()
      ? `<span class="filled-value">${String(val).trim()}</span>`
      : `<span class="blank-cell-line" style="display: block; width: 100%; border-bottom: 1px dashed #94a3b8; height: 18px;">&nbsp;</span>`;
    return `
      <tr style="min-height: 11mm; height: 11mm;">
        <td style="width: 38%; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc; vertical-align: middle;">${label}</td>
        <td style="width: 62%; padding: 6px 10px; border: 1px solid #cbd5e1; vertical-align: middle;">${content}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="form-table" style="width: 100%; border-collapse: collapse; margin: 12px 0;">
      <tbody>
        ${renderedRows}
      </tbody>
    </table>
  `;
}

function blankBox(options = {}) {
  const heightMm = options.heightMm || 40;
  const label = options.label || "";
  return `
    <div class="blank-box" style="height: ${heightMm}mm; border: 1.5px dashed #94a3b8; border-radius: 4px; background: #fafafa; position: relative; margin: 10px 0;">
      ${label ? `<span style="position: absolute; top: 6px; left: 8px; font-size: 8.5pt; color: #94a3b8; text-transform: uppercase;">${label}</span>` : ""}
    </div>
  `;
}

function blankLines(options = {}) {
  const n = options.n || 4;
  const gapMm = options.gapMm || 9;
  let html = `<div class="blank-lines-container" style="margin: 8px 0;">`;
  for (let i = 0; i < n; i++) {
    html += `<div class="ruled-line" style="height: ${gapMm}mm; border-bottom: 1px solid #cbd5e1; width: 100%;"></div>`;
  }
  html += `</div>`;
  return html;
}

function signatureBlock(labels = []) {
  const widthPct = Math.floor(100 / (labels.length || 1));
  const cols = labels.map((item) => {
    const title = typeof item === "string" ? item : item.title;
    const name = typeof item === "object" ? item.name : "";
    return `
      <td style="width: ${widthPct}%; vertical-align: bottom; padding: 0 12px; text-align: center;">
        <div style="height: 22mm; border-bottom: 1.5px solid #334155; margin-bottom: 6px; display: flex; align-items: flex-end; justify-content: center;">
          ${name ? `<span style="font-weight: 600; font-size: 10pt; color: #1e293b;">${name}</span>` : ""}
        </div>
        <div style="font-weight: bold; font-size: 9.5pt; color: #334155;">${title}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Date: ________________</div>
      </td>
    `;
  }).join("");

  return `
    <table class="signature-table" style="width: 100%; border-collapse: collapse; margin-top: 24px;">
      <tr>
        ${cols}
      </tr>
    </table>
  `;
}

module.exports = {
  field,
  formTable,
  blankBox,
  blankLines,
  signatureBlock
};
