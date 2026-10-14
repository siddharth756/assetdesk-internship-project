// Purpose: Unit tests for CSV generator service covering RFC-4180 escaping and spreadsheet injection protection
const { toCsv, sanitizeCell } = require("../../src/services/csv");

describe("CSV Unit Tests (Module M5)", () => {
  describe("sanitizeCell", () => {
    it("UT-01 should return empty string for null and undefined", () => {
      expect(sanitizeCell(null)).toBe("");
      expect(sanitizeCell(undefined)).toBe("");
    });

    it("UT-02 should return plain alphanumeric strings untouched", () => {
      expect(sanitizeCell("Hello World")).toBe("Hello World");
      expect(sanitizeCell(12345)).toBe("12345");
      expect(sanitizeCell(true)).toBe("true");
    });

    it("UT-03 should wrap cells containing commas in double quotes", () => {
      expect(sanitizeCell("San Francisco, CA")).toBe('"San Francisco, CA"');
    });

    it("UT-04 should double internal quotes and wrap in quotes for cells with double quotes", () => {
      expect(sanitizeCell('Dell 27" 4K Monitor')).toBe('"Dell 27"" 4K Monitor"');
    });

    it("UT-05 should wrap cells containing newline characters in quotes", () => {
      expect(sanitizeCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(sanitizeCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("UT-06 should mitigate formula injection by prefixing '=' with single quote", () => {
      const sanitized = sanitizeCell("=SUM(A1:A10)");
      expect(sanitized).toBe("'=SUM(A1:A10)");
    });

    it("UT-07 should mitigate formula injection by prefixing '+' with single quote", () => {
      const sanitized = sanitizeCell("+123456789");
      expect(sanitized).toBe("'+123456789");
    });

    it("UT-08 should mitigate formula injection by prefixing '-' with single quote", () => {
      const sanitized = sanitizeCell("-5000");
      expect(sanitized).toBe("'-5000");
    });

    it("UT-09 should mitigate formula injection by prefixing '@' with single quote", () => {
      const sanitized = sanitizeCell("@SUM(1,2)");
      expect(sanitized).toBe('"\'@SUM(1,2)"');
    });

    it("UT-10 should format Date instances into ISO date strings", () => {
      const date = new Date("2026-05-15T12:00:00.000Z");
      expect(sanitizeCell(date)).toBe("2026-05-15T12:00:00.000Z");
    });
  });

  describe("toCsv", () => {
    const columns = [
      { key: "assetTag", header: "Asset Tag" },
      { key: "name", header: "Asset Name" },
      { key: "category", header: "Category" },
      { key: "notes", header: "Notes" }
    ];

    it("UT-11 should generate proper header row and CRLF separated data rows", () => {
      const rows = [
        { assetTag: "AST-2026-0001", name: "MacBook Pro", category: "LAPTOP", notes: "Standard issue" },
        { assetTag: "AST-2026-0002", name: "Dell XPS", category: "LAPTOP", notes: "Developer edition" }
      ];

      const csv = toCsv(columns, rows);
      expect(csv).toContain("Asset Tag,Asset Name,Category,Notes\r\n");
      expect(csv).toContain("AST-2026-0001,MacBook Pro,LAPTOP,Standard issue\r\n");
      expect(csv).toContain("AST-2026-0002,Dell XPS,LAPTOP,Developer edition\r\n");
    });

    it("UT-12 should correctly escape commas, quotes, and newlines across multi-column data", () => {
      const rows = [
        {
          assetTag: "AST-2026-0003",
          name: 'Display 32", 4K',
          category: "MONITOR",
          notes: 'Condition: "Refurbished",\nChecked by QA'
        }
      ];

      const csv = toCsv(columns, rows);
      expect(csv).toContain('"Display 32"", 4K"');
      expect(csv).toContain('"Condition: ""Refurbished"",\nChecked by QA"');
    });

    it("UT-13 should protect against spreadsheet formula injection in CSV cells", () => {
      const rows = [
        {
          assetTag: "AST-2026-0004",
          name: "=cmd|'/C calc'!A0",
          category: "OTHER",
          notes: "@exploit"
        }
      ];

      const csv = toCsv(columns, rows);
      expect(csv).toContain("'=cmd|'/C calc'!A0");
      expect(csv).toContain("'@exploit");
    });

    it("UT-14 should return only header row when rows array is empty", () => {
      const csv = toCsv(columns, []);
      expect(csv).toBe("Asset Tag,Asset Name,Category,Notes\r\n");
    });

    it("UT-15 should support array of column strings as simplified column definitions", () => {
      const simpleCols = ["assetTag", "name"];
      const rows = [{ assetTag: "AST-2026-0005", name: "Test Device" }];

      const csv = toCsv(simpleCols, rows);
      expect(csv).toBe("assetTag,name\r\nAST-2026-0005,Test Device\r\n");
    });

    it("UT-16 should return empty string if columns array is missing or empty", () => {
      expect(toCsv([], [{ foo: "bar" }])).toBe("");
      expect(toCsv(null, [{ foo: "bar" }])).toBe("");
    });
  });
});
