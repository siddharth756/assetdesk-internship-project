const fs = require("fs");
const path = require("path");

const models = [
  { name: "User", file: "server/src/models/User.js" },
  { name: "Asset", file: "server/src/models/Asset.js" },
  { name: "License", file: "server/src/models/License.js" },
  { name: "Ticket", file: "server/src/models/Ticket.js" },
  { name: "AuditLog", file: "server/src/models/AuditLog.js" },
  { name: "Counter", file: "server/src/models/Counter.js" }
];

const descriptions = {
  User: {
    _id: "Primary key, unique 12-byte BSON identifier",
    name: "Full name of the user (2-100 characters)",
    email: "Unique login and contact email address (lowercase)",
    passwordHash: "Bcrypt salted hash with 10 salt rounds (hidden by default)",
    role: "Access tier: ADMIN, IT_SUPPORT, or EMPLOYEE",
    department: "Corporate department / division assignment",
    isActive: "Account operational state flag (soft deactivation)",
    createdAt: "Timestamp when user record was created",
    updatedAt: "Timestamp when user record was last modified"
  },
  Asset: {
    _id: "Primary key, unique 12-byte BSON identifier",
    assetTag: "Sequential hardware tag identifier (e.g., AST-2026-0001)",
    serialNumber: "Unique OEM hardware serial number",
    name: "Hardware brand, model, and configuration title",
    category: "Hardware category: LAPTOP, DESKTOP, MONITOR, PRINTER, NETWORK, MOBILE, OTHER",
    status: "Lifecycle state: AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED",
    assignedTo: "Foreign key reference to User model (null if available)",
    purchaseDate: "Procurement / invoice date of hardware asset",
    warrantyExpiry: "Warranty protection expiration date",
    notes: "Internal hardware specifications and maintenance notes",
    createdAt: "Timestamp when asset was registered",
    updatedAt: "Timestamp when asset record was last modified"
  },
  License: {
    _id: "Primary key, unique 12-byte BSON identifier",
    softwareName: "Commercial software application title",
    vendor: "Software publishing company / publisher name",
    licenseKey: "Volume license or activation key (masked in UI)",
    totalSeats: "Maximum permitted concurrent user seat capacity",
    allocations: "Subdocument array of active seat assignments to users",
    "allocations.user": "Foreign key reference to allocated User",
    "allocations.allocatedAt": "Timestamp when license seat was assigned",
    expiryDate: "Subscription renewal or perpetual license expiry date",
    notes: "Contract, renewal, and vendor licensing details",
    createdAt: "Timestamp when license was registered",
    updatedAt: "Timestamp when license was last modified"
  },
  Ticket: {
    _id: "Primary key, unique 12-byte BSON identifier",
    ticketCode: "Sequential ticket identifier (e.g., TCK-2026-0001)",
    title: "Brief summary of technical issue (5-150 characters)",
    description: "Detailed description of problem or service request",
    category: "Issue classification: HARDWARE, SOFTWARE, NETWORK, ACCESS, OTHER",
    priority: "Urgency rating: LOW, MEDIUM, HIGH, CRITICAL",
    status: "Lifecycle workflow: OPEN, IN_PROGRESS, RESOLVED, CLOSED",
    createdBy: "Foreign key reference to User who filed the ticket",
    assignedTo: "Foreign key reference to IT_SUPPORT technician assigned",
    relatedAsset: "Optional foreign key reference to Asset involved",
    comments: "Subdocument array of chronological comment thread messages",
    "comments.author": "Foreign key reference to comment author",
    "comments.message": "Content text of response comment",
    "comments.createdAt": "Timestamp when comment was submitted",
    dueAt: "Calculated SLA resolution deadline based on priority",
    resolvedAt: "Timestamp when technician marked ticket RESOLVED",
    resolutionNote: "Mandatory resolution documentation (>= 5 chars)",
    closedAt: "Timestamp when administrator closed the ticket",
    createdAt: "Timestamp when ticket was opened",
    updatedAt: "Timestamp when ticket record was last modified"
  },
  AuditLog: {
    _id: "Primary key, unique 12-byte BSON identifier",
    user: "Foreign key reference to acting User (null for system jobs)",
    userName: "Immutable snapshot of user full name at event time",
    action: "Categorized audit event code (e.g., LOGIN, ASSET_ASSIGN, TICKET_STATUS)",
    entity: "Target resource collection: AUTH, USER, ASSET, LICENSE, TICKET",
    entityId: "String identifier of target resource affected",
    details: "JSON or stringified change delta and operation payload",
    ipAddress: "Client IP address captured from request header",
    userAgent: "Client browser user agent header string",
    timestamp: "Immutable timestamp of event occurrence"
  },
  Counter: {
    _id: "Primary key, unique 12-byte BSON identifier",
    key: "Unique sequence namespace identifier (e.g., asset-2026, ticket-2026)",
    seq: "Current atomic monotonic integer sequence value",
    createdAt: "Timestamp when sequence counter was initialized",
    updatedAt: "Timestamp when sequence was last incremented"
  }
};

const output = {};

for (const m of models) {
  const modelPath = path.resolve(__dirname, "../../..", m.file);
  const Model = require(modelPath);
  const schema = Model.schema;
  const fields = [];

  for (const [pathname, schemaType] of Object.entries(schema.paths)) {
    if (pathname === "__v") continue;

    let typeStr = schemaType.instance || "Mixed";
    if (schemaType.caster && schemaType.caster.instance) {
      typeStr = `Array<${schemaType.caster.instance}>`;
    }

    const isRequired = Boolean(
      schemaType.options && schemaType.options.required
    );

    let keyOrIndex = "—";
    if (pathname === "_id") {
      keyOrIndex = "Primary Key (PK)";
    } else if (schemaType.options && schemaType.options.unique) {
      keyOrIndex = "Unique Index";
    } else if (schemaType.options && schemaType.options.index) {
      keyOrIndex = "Index";
    } else if (schemaType.options && schemaType.options.ref) {
      keyOrIndex = `FK → ${schemaType.options.ref}`;
    } else if (schemaType.caster && schemaType.caster.options && schemaType.caster.options.ref) {
      keyOrIndex = `FK → ${schemaType.caster.options.ref}`;
    }

    const desc = (descriptions[m.name] && descriptions[m.name][pathname]) || "Attribute value";

    fields.push({
      field: pathname,
      type: typeStr,
      required: isRequired ? "Yes" : "No",
      keyOrIndex,
      description: desc
    });
  }

  output[m.name] = fields;
}

const outputPath = path.resolve(__dirname, "../data/data-dictionary.json");
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
console.log(`Successfully generated data dictionary for ${Object.keys(output).length} models at: ${outputPath}`);
