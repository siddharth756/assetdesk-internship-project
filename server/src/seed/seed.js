// Purpose: Database seeding script to populate initial users, assets, licenses, and tickets
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/db");
const config = require("../config/env");
const { User, Asset, License, Ticket, AuditLog, Counter } = require("../models");
const { startOfToday, addDays, addHours } = require("../utils/dates");

async function seedDatabase(options = {}) {
  const silent = options.silent || false;
  const currentYear = new Date().getFullYear();

  // 1. Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Asset.deleteMany({}),
    License.deleteMany({}),
    Ticket.deleteMany({}),
    AuditLog.deleteMany({}, { bypassAuditLock: true }),
    Counter.deleteMany({})
  ]);

  // 2. Hash default password
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  // 3. Seed Users (8 total: 1 ADMIN, 2 IT_SUPPORT, 5 EMPLOYEE)
  const usersData = [
    {
      name: "System Administrator",
      email: "admin@assetdesk.local",
      passwordHash,
      role: "ADMIN",
      department: "IT Infrastructure",
      isActive: true
    },
    {
      name: "Alex Support",
      email: "support1@assetdesk.local",
      passwordHash,
      role: "IT_SUPPORT",
      department: "IT Support",
      isActive: true
    },
    {
      name: "Sam Support",
      email: "support2@assetdesk.local",
      passwordHash,
      role: "IT_SUPPORT",
      department: "IT Support",
      isActive: true
    },
    {
      name: "Emily Clark",
      email: "emp1@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Engineering",
      isActive: true
    },
    {
      name: "David Miller",
      email: "emp2@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Engineering",
      isActive: true
    },
    {
      name: "Sarah Connor",
      email: "emp3@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "QA",
      isActive: true
    },
    {
      name: "Michael Scott",
      email: "emp4@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "HR",
      isActive: true
    },
    {
      name: "Rachel Green",
      email: "emp5@assetdesk.local",
      passwordHash,
      role: "EMPLOYEE",
      department: "Finance",
      isActive: true
    }
  ];

  const createdUsers = await User.insertMany(usersData);
  const userMap = {};
  createdUsers.forEach((u) => {
    userMap[u.email] = u;
  });

  // 4. Seed Assets (15 total across categories and statuses)
  const assetsData = [
    {
      assetTag: `AST-${currentYear}-0001`,
      serialNumber: "SN-LAP-1001",
      name: "MacBook Pro 16\" M3",
      category: "LAPTOP",
      status: "ASSIGNED",
      assignedTo: userMap["emp1@assetdesk.local"]._id,
      purchaseDate: new Date("2024-01-15"),
      warrantyExpiry: new Date("2027-01-15"),
      notes: "Primary development machine for Emily Clark"
    },
    {
      assetTag: `AST-${currentYear}-0002`,
      serialNumber: "SN-LAP-1002",
      name: "Dell XPS 15 9530",
      category: "LAPTOP",
      status: "ASSIGNED",
      assignedTo: userMap["emp2@assetdesk.local"]._id,
      purchaseDate: new Date("2024-02-10"),
      warrantyExpiry: new Date("2027-02-10"),
      notes: "Assigned to David Miller"
    },
    {
      assetTag: `AST-${currentYear}-0003`,
      serialNumber: "SN-LAP-1003",
      name: "Lenovo ThinkPad T14s Gen 4",
      category: "LAPTOP",
      status: "ASSIGNED",
      assignedTo: userMap["emp3@assetdesk.local"]._id,
      purchaseDate: new Date("2024-03-05"),
      warrantyExpiry: new Date("2027-03-05"),
      notes: "QA testing laptop"
    },
    {
      assetTag: `AST-${currentYear}-0004`,
      serialNumber: "SN-LAP-1004",
      name: "HP EliteBook 840 G10",
      category: "LAPTOP",
      status: "AVAILABLE",
      assignedTo: null,
      purchaseDate: new Date("2024-04-12"),
      warrantyExpiry: new Date("2027-04-12"),
      notes: "Ready for deployment"
    },
    {
      assetTag: `AST-${currentYear}-0005`,
      serialNumber: "SN-DSK-2001",
      name: "Dell OptiPlex 7010 Tower",
      category: "DESKTOP",
      status: "ASSIGNED",
      assignedTo: userMap["emp4@assetdesk.local"]._id,
      purchaseDate: new Date("2023-08-20"),
      warrantyExpiry: new Date("2026-08-20"),
      notes: "HR department desktop"
    },
    {
      assetTag: `AST-${currentYear}-0006`,
      serialNumber: "SN-DSK-2002",
      name: "HP ProDesk 600 G6",
      category: "DESKTOP",
      status: "ASSIGNED",
      assignedTo: userMap["emp5@assetdesk.local"]._id,
      purchaseDate: new Date("2023-09-15"),
      warrantyExpiry: new Date("2026-09-15"),
      notes: "Finance workstation"
    },
    {
      assetTag: `AST-${currentYear}-0007`,
      serialNumber: "SN-DSK-2003",
      name: "Lenovo ThinkCentre M70q Tiny",
      category: "DESKTOP",
      status: "AVAILABLE",
      assignedTo: null,
      purchaseDate: new Date("2024-05-10"),
      warrantyExpiry: new Date("2027-05-10"),
      notes: "Spare desktop unit"
    },
    {
      assetTag: `AST-${currentYear}-0008`,
      serialNumber: "SN-MON-3001",
      name: "Dell UltraSharp 27\" 4K U2723QE",
      category: "MONITOR",
      status: "ASSIGNED",
      assignedTo: userMap["emp1@assetdesk.local"]._id,
      purchaseDate: new Date("2024-01-20"),
      warrantyExpiry: new Date("2027-01-20"),
      notes: "Dual monitor setup for engineering"
    },
    {
      assetTag: `AST-${currentYear}-0009`,
      serialNumber: "SN-MON-3002",
      name: "LG 27\" QHD UltraFine",
      category: "MONITOR",
      status: "AVAILABLE",
      assignedTo: null,
      purchaseDate: new Date("2024-06-01"),
      warrantyExpiry: new Date("2027-06-01"),
      notes: "Available in IT inventory"
    },
    {
      assetTag: `AST-${currentYear}-0010`,
      serialNumber: "SN-MON-3003",
      name: "Samsung 24\" FHD Business Monitor",
      category: "MONITOR",
      status: "AVAILABLE",
      assignedTo: null,
      purchaseDate: new Date("2023-11-15"),
      warrantyExpiry: new Date("2026-11-15"),
      notes: "Floor 2 spare monitor"
    },
    {
      assetTag: `AST-${currentYear}-0011`,
      serialNumber: "SN-PRN-4001",
      name: "HP LaserJet Enterprise M507x",
      category: "PRINTER",
      status: "MAINTENANCE",
      assignedTo: null,
      purchaseDate: new Date("2023-05-10"),
      warrantyExpiry: new Date("2026-05-10"),
      notes: "Fuser unit replacement in progress"
    },
    {
      assetTag: `AST-${currentYear}-0012`,
      serialNumber: "SN-NET-5001",
      name: "Cisco Catalyst 9200L 48-Port Switch",
      category: "NETWORK",
      status: "AVAILABLE",
      assignedTo: null,
      purchaseDate: new Date("2023-04-01"),
      warrantyExpiry: new Date("2028-04-01"),
      notes: "Server room rack B switch"
    },
    {
      assetTag: `AST-${currentYear}-0013`,
      serialNumber: "SN-NET-5002",
      name: "Ubiquiti UniFi 6 Pro Access Point",
      category: "NETWORK",
      status: "MAINTENANCE",
      assignedTo: null,
      purchaseDate: new Date("2023-10-18"),
      warrantyExpiry: new Date("2025-10-18"),
      notes: "Firmware upgrade and testing"
    },
    {
      assetTag: `AST-${currentYear}-0014`,
      serialNumber: "SN-MOB-6001",
      name: "Apple iPhone 15 Test Device",
      category: "MOBILE",
      status: "ASSIGNED",
      assignedTo: userMap["support1@assetdesk.local"]._id,
      purchaseDate: new Date("2024-02-15"),
      warrantyExpiry: new Date("2025-02-15"),
      notes: "Mobile app QA and 2FA verification device"
    },
    {
      assetTag: `AST-${currentYear}-0015`,
      serialNumber: "SN-OTH-7001",
      name: "APC Smart-UPS 1500VA",
      category: "OTHER",
      status: "RETIRED",
      assignedTo: null,
      purchaseDate: new Date("2019-03-10"),
      warrantyExpiry: new Date("2022-03-10"),
      notes: "Battery degraded. Decommissioned and recycled."
    }
  ];

  const createdAssets = await Asset.insertMany(assetsData);
  await Counter.findOneAndUpdate(
    { key: `asset-${currentYear}` },
    { seq: 15 },
    { upsert: true }
  );

  // 5. Seed Licenses (5 total: 1 expired, 1 expiring in 12 days, 1 expiring in 25 days, 2 active)
  const today = startOfToday();
  const licensesData = [
    {
      softwareName: "Adobe Creative Cloud All Apps",
      vendor: "Adobe Systems",
      licenseKey: "ADOBE-CC-2025-ABCD-9876",
      totalSeats: 3,
      allocations: [
        { user: userMap["emp4@assetdesk.local"]._id, allocatedAt: new Date("2024-01-10") },
        { user: userMap["emp5@assetdesk.local"]._id, allocatedAt: new Date("2024-01-15") }
      ],
      expiryDate: addDays(today, -15), // Expired 15 days ago
      notes: "Annual renewal pending finance approval"
    },
    {
      softwareName: "JetBrains All Products Pack",
      vendor: "JetBrains s.r.o.",
      licenseKey: "JB-APP-2026-ZXCV-5432",
      totalSeats: 5,
      allocations: [
        { user: userMap["emp1@assetdesk.local"]._id, allocatedAt: new Date("2024-03-01") },
        { user: userMap["emp2@assetdesk.local"]._id, allocatedAt: new Date("2024-03-01") }
      ],
      expiryDate: addDays(today, 12), // Expiring in 12 days
      notes: "Developer IDE pack for backend and frontend engineering"
    },
    {
      softwareName: "Slack Pro Enterprise",
      vendor: "Slack Technologies",
      licenseKey: "SLACK-ENT-2026-QWER-7788",
      totalSeats: 10,
      allocations: [
        { user: userMap["emp1@assetdesk.local"]._id, allocatedAt: new Date("2024-02-01") },
        { user: userMap["emp2@assetdesk.local"]._id, allocatedAt: new Date("2024-02-01") },
        { user: userMap["emp3@assetdesk.local"]._id, allocatedAt: new Date("2024-02-01") },
        { user: userMap["emp4@assetdesk.local"]._id, allocatedAt: new Date("2024-02-01") },
        { user: userMap["emp5@assetdesk.local"]._id, allocatedAt: new Date("2024-02-01") }
      ],
      expiryDate: addDays(today, 25), // Expiring in 25 days
      notes: "Company workspace communications license"
    },
    {
      softwareName: "Microsoft 365 Business Premium",
      vendor: "Microsoft Corporation",
      licenseKey: "MS365-PREM-2026-MNB-1122",
      totalSeats: 25,
      allocations: [
        { user: userMap["admin@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["support1@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["support2@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["emp1@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["emp2@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["emp3@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["emp4@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") },
        { user: userMap["emp5@assetdesk.local"]._id, allocatedAt: new Date("2024-01-01") }
      ],
      expiryDate: addDays(today, 180), // Active (180 days)
      notes: "Standard office productivity and Outlook suite"
    },
    {
      softwareName: "Zoom Workplace Pro",
      vendor: "Zoom Video Communications",
      licenseKey: "ZOOM-PRO-2026-LKJH-3344",
      totalSeats: 15,
      allocations: [
        { user: userMap["emp3@assetdesk.local"]._id, allocatedAt: new Date("2024-04-10") },
        { user: userMap["emp4@assetdesk.local"]._id, allocatedAt: new Date("2024-04-10") }
      ],
      expiryDate: addDays(today, 365), // Active (365 days)
      notes: "Video conferencing and remote standup rooms"
    }
  ];

  const createdLicenses = await License.insertMany(licensesData);

  // 6. Seed Tickets (12 total across categories, priorities, statuses)
  const now = new Date();
  const ticketsData = [
    {
      ticketCode: `TCK-${currentYear}-0001`,
      title: "MacBook battery drains abnormally fast",
      description: "Battery discharges from 100% to 15% in less than 2 hours under light web browsing.",
      category: "HARDWARE",
      priority: "HIGH",
      status: "OPEN",
      createdBy: userMap["emp1@assetdesk.local"]._id,
      assignedTo: null,
      relatedAsset: createdAssets[0]._id,
      dueAt: addHours(now, 24),
      comments: [
        {
          author: userMap["emp1@assetdesk.local"]._id,
          message: "Observed the issue since yesterday afternoon.",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
        }
      ]
    },
    {
      ticketCode: `TCK-${currentYear}-0002`,
      title: "VPN connection drops every 20 minutes",
      description: "Unable to maintain stable remote tunnel to internal staging database.",
      category: "NETWORK",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      createdBy: userMap["emp2@assetdesk.local"]._id,
      assignedTo: userMap["support1@assetdesk.local"]._id,
      relatedAsset: createdAssets[1]._id,
      dueAt: addHours(now, 4),
      comments: [
        {
          author: userMap["support1@assetdesk.local"]._id,
          message: "Investigating gateway firewall logs and keep-alive timeout settings.",
          createdAt: new Date(now.getTime() - 60 * 60 * 1000)
        }
      ]
    },
    {
      ticketCode: `TCK-${currentYear}-0003`,
      title: "Request access to GitHub organization and CI/CD pipelines",
      description: "Need write permissions for internship project repository and deployment triggers.",
      category: "ACCESS",
      priority: "MEDIUM",
      status: "RESOLVED",
      createdBy: userMap["emp3@assetdesk.local"]._id,
      assignedTo: userMap["support2@assetdesk.local"]._id,
      relatedAsset: null,
      dueAt: addHours(now, 48),
      resolutionNote: "Added to engineering GitHub team with developer role.",
      resolvedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      ticketCode: `TCK-${currentYear}-0004`,
      title: "Floor 2 HP LaserJet paper feed jam",
      description: "Printer displays error code 13.00.00 paper jam in tray 2.",
      category: "HARDWARE",
      priority: "LOW",
      status: "CLOSED",
      createdBy: userMap["emp4@assetdesk.local"]._id,
      assignedTo: userMap["support1@assetdesk.local"]._id,
      relatedAsset: createdAssets[10]._id,
      dueAt: addHours(now, 72),
      resolutionNote: "Removed jammed sheet and cleaned roller surfaces.",
      resolvedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
    },
    {
      ticketCode: `TCK-${currentYear}-0005`,
      title: "Docker desktop license renewal required",
      description: "Docker shows notification that enterprise subscription requires key refresh.",
      category: "SOFTWARE",
      priority: "HIGH",
      status: "OPEN",
      createdBy: userMap["emp2@assetdesk.local"]._id,
      assignedTo: null,
      relatedAsset: createdAssets[1]._id,
      dueAt: addHours(now, 24)
    },
    {
      ticketCode: `TCK-${currentYear}-0006`,
      title: "Finance Excel add-in crashing on launch",
      description: "ERP accounting macro add-in throws runtime error 53 on Windows desktop.",
      category: "SOFTWARE",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      createdBy: userMap["emp5@assetdesk.local"]._id,
      assignedTo: userMap["support2@assetdesk.local"]._id,
      relatedAsset: createdAssets[5]._id,
      dueAt: addHours(now, 48),
      comments: [
        {
          author: userMap["support2@assetdesk.local"]._id,
          message: "Reinstalling Visual C++ redistributable packages.",
          createdAt: new Date(now.getTime() - 30 * 60 * 1000)
        }
      ]
    },
    {
      ticketCode: `TCK-${currentYear}-0007`,
      title: "External 4K monitor flickering via USB-C",
      description: "Dell U2723QE monitor blinks black every few minutes when connected via Thunderbolt.",
      category: "HARDWARE",
      priority: "MEDIUM",
      status: "OPEN",
      createdBy: userMap["emp1@assetdesk.local"]._id,
      assignedTo: null,
      relatedAsset: createdAssets[7]._id,
      dueAt: addHours(now, 48)
    },
    {
      ticketCode: `TCK-${currentYear}-0008`,
      title: "Guest Wi-Fi network unreachable from reception",
      description: "Visitors unable to obtain IP address from guest subnet DHCP.",
      category: "NETWORK",
      priority: "CRITICAL",
      status: "RESOLVED",
      createdBy: userMap["emp4@assetdesk.local"]._id,
      assignedTo: userMap["support1@assetdesk.local"]._id,
      relatedAsset: createdAssets[12]._id,
      dueAt: addHours(now, 4),
      resolutionNote: "Restarted access point and renewed DHCP pool lease range.",
      resolvedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    },
    {
      ticketCode: `TCK-${currentYear}-0009`,
      title: "Reset forgotten password for staging portal",
      description: "Employee locked out after 3 failed login attempts on QA test bench.",
      category: "ACCESS",
      priority: "LOW",
      status: "CLOSED",
      createdBy: userMap["emp3@assetdesk.local"]._id,
      assignedTo: userMap["support2@assetdesk.local"]._id,
      relatedAsset: null,
      dueAt: addHours(now, 72),
      resolutionNote: "Sent secure one-time password reset link to verified email.",
      resolvedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 30 * 60 * 60 * 1000)
    },
    {
      ticketCode: `TCK-${currentYear}-0010`,
      title: "Ergonomic keyboard and mouse request",
      description: "Requesting split mechanical keyboard and vertical mouse for workstation.",
      category: "OTHER",
      priority: "LOW",
      status: "OPEN",
      createdBy: userMap["emp5@assetdesk.local"]._id,
      assignedTo: null,
      relatedAsset: null,
      dueAt: addHours(now, 72)
    },
    {
      ticketCode: `TCK-${currentYear}-0011`,
      title: "Production database replica high memory warning",
      description: "Alert received: Redis caching cluster node memory utilization exceeded 92%.",
      category: "NETWORK",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      createdBy: userMap["support1@assetdesk.local"]._id,
      assignedTo: userMap["admin@assetdesk.local"]._id,
      relatedAsset: null,
      dueAt: addHours(now, 4),
      comments: [
        {
          author: userMap["admin@assetdesk.local"]._id,
          message: "Evicting expired session keys and expanding cluster node memory.",
          createdAt: new Date(now.getTime() - 15 * 60 * 1000)
        }
      ]
    },
    {
      ticketCode: `TCK-${currentYear}-0012`,
      title: "Slack audio calling crackling on Mac client",
      description: "Audio breaks up during huddle calls despite high speed wired Ethernet.",
      category: "SOFTWARE",
      priority: "MEDIUM",
      status: "RESOLVED",
      createdBy: userMap["emp1@assetdesk.local"]._id,
      assignedTo: userMap["support1@assetdesk.local"]._id,
      relatedAsset: createdAssets[0]._id,
      dueAt: addHours(now, 48),
      resolutionNote: "Cleared Slack audio cache and adjusted sample rate to 48kHz.",
      resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    }
  ];

  const createdTickets = await Ticket.insertMany(ticketsData);
  await Counter.findOneAndUpdate(
    { key: `ticket-${currentYear}` },
    { seq: 12 },
    { upsert: true }
  );

  // 7. Seed initial AuditLog entries
  const auditLogsData = [
    {
      user: userMap["admin@assetdesk.local"]._id,
      userName: userMap["admin@assetdesk.local"].name,
      action: "USER_CREATE",
      entity: "USER",
      entityId: userMap["admin@assetdesk.local"]._id.toString(),
      details: "Initial system administrator created via seed script",
      ip: "127.0.0.1"
    },
    {
      user: userMap["admin@assetdesk.local"]._id,
      userName: userMap["admin@assetdesk.local"].name,
      action: "ASSET_CREATE",
      entity: "ASSET",
      entityId: createdAssets[0]._id.toString(),
      details: `Asset ${createdAssets[0].assetTag} registered`,
      ip: "127.0.0.1"
    },
    {
      user: userMap["admin@assetdesk.local"]._id,
      userName: userMap["admin@assetdesk.local"].name,
      action: "LICENSE_CREATE",
      entity: "LICENSE",
      entityId: createdLicenses[1]._id.toString(),
      details: `License ${createdLicenses[1].softwareName} added`,
      ip: "127.0.0.1"
    },
    {
      user: userMap["emp1@assetdesk.local"]._id,
      userName: userMap["emp1@assetdesk.local"].name,
      action: "TICKET_CREATE",
      entity: "TICKET",
      entityId: createdTickets[0]._id.toString(),
      details: `Ticket ${createdTickets[0].ticketCode} submitted`,
      ip: "127.0.0.1"
    }
  ];

  await AuditLog.insertMany(auditLogsData);

  const summary = [
    { Entity: "Users", Count: createdUsers.length, Expected: 8 },
    { Entity: "Assets", Count: createdAssets.length, Expected: 15 },
    { Entity: "Licenses", Count: createdLicenses.length, Expected: 5 },
    { Entity: "Tickets", Count: createdTickets.length, Expected: 12 },
    { Entity: "AuditLogs", Count: auditLogsData.length, Expected: ">= 1" }
  ];

  if (!silent) {
    console.log("\n==================================================");
    console.log("       ASSETDESK SEED DATA SUMMARY TABLE          ");
    console.log("==================================================");
    console.table(summary);
    console.log("==================================================\n");
  }

  return {
    users: createdUsers,
    assets: createdAssets,
    licenses: createdLicenses,
    tickets: createdTickets
  };
}

// Direct execution runner
if (require.main === module) {
  (async () => {
    try {
      await connectDB(config.MONGODB_URI);
      await seedDatabase();
      console.log("Seed completed successfully!");
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error("Seed execution failed:", err);
      process.exit(1);
    }
  })();
}

module.exports = { seedDatabase };
