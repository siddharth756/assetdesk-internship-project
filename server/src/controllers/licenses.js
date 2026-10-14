// Purpose: Software license management controller implementing Module M3 operations
const { License, User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { safeAudit } = require("../middleware/audit");
const { startOfToday, addDays } = require("../utils/dates");

/**
 * Masks a license key showing only the last 4 characters (e.g. ****-****-XXXX)
 * @param {string} key
 * @returns {string}
 */
function maskLicenseKey(key) {
  if (!key) return "****-****-****";
  const str = String(key);
  const last4 = str.length >= 4 ? str.slice(-4) : str;
  return `****-****-${last4}`;
}

/**
 * Formats a license document with seat virtuals and applies license key masking rules:
 * - ADMIN receives full unmasked key in detail view only
 * - IT_SUPPORT receives masked key in all views
 * - List views always return masked key for all roles
 * @param {Object} doc - Mongoose License document or plain object
 * @param {string} role - Current authenticated user's role
 * @param {boolean} [isDetail=false] - Whether this is a single item detail view
 * @returns {Object} Formatted license object
 */
function formatLicense(doc, role, isDetail = false) {
  const obj = typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc };

  if (isDetail && role === "ADMIN") {
    // Keep full license key for admin detail view
    return obj;
  }

  // Mask license key for IT_SUPPORT in detail view and for all roles in list views
  obj.licenseKey = maskLicenseKey(obj.licenseKey);
  return obj;
}

/**
 * @desc    Get paginated software licenses with search, status filtering, and sorting
 * @route   GET /api/v1/licenses
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const getLicenses = asyncHandler(async (req, res) => {
  const query = {};
  const searchTerm = req.query.q || req.query.search;

  if (searchTerm && typeof searchTerm === "string" && searchTerm.trim() !== "") {
    const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { softwareName: { $regex: escaped, $options: "i" } },
      { vendor: { $regex: escaped, $options: "i" } }
    ];
  }

  // Translate computed status (ACTIVE | EXPIRING | EXPIRED) to date ranges in MongoDB query
  if (req.query.status && ["ACTIVE", "EXPIRING", "EXPIRED"].includes(req.query.status)) {
    const today = startOfToday();
    const thirtyDaysAhead = addDays(today, 30);
    thirtyDaysAhead.setHours(23, 59, 59, 999);

    if (req.query.status === "EXPIRED") {
      query.expiryDate = { $lt: today };
    } else if (req.query.status === "EXPIRING") {
      query.expiryDate = { $gte: today, $lte: thirtyDaysAhead };
    } else if (req.query.status === "ACTIVE") {
      query.expiryDate = { $gt: thirtyDaysAhead };
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const allowedSorts = {
    expiryDate: { expiryDate: 1 },
    "-expiryDate": { expiryDate: -1 },
    softwareName: { softwareName: 1 },
    "-softwareName": { softwareName: -1 },
    createdAt: { createdAt: 1 },
    "-createdAt": { createdAt: -1 }
  };
  const sortOption = allowedSorts[req.query.sort] || { expiryDate: 1 };

  const total = await License.countDocuments(query);
  const licenses = await License.find(query).sort(sortOption).skip(skip).limit(limit);

  // List view shows masked key for everyone
  const formattedLicenses = licenses.map((item) => formatLicense(item, req.user.role, false));

  res.status(200).json({
    success: true,
    data: formattedLicenses,
    meta: {
      page,
      limit,
      total
    }
  });
});

/**
 * @desc    Get licenses expiring within N days (plus already expired), sorted by expiryDate ascending
 * @route   GET /api/v1/licenses/expiring
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const getExpiringLicenses = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const today = startOfToday();
  const threshold = addDays(today, days);
  threshold.setHours(23, 59, 59, 999);

  const query = { expiryDate: { $lte: threshold } };
  const licenses = await License.find(query).sort({ expiryDate: 1 });

  // List view shows masked key for everyone
  const formattedLicenses = licenses.map((item) => formatLicense(item, req.user.role, false));

  res.status(200).json({
    success: true,
    data: formattedLicenses
  });
});

/**
 * @desc    Get single license by ID
 * @route   GET /api/v1/licenses/:id
 * @access  Private (ADMIN receives full key; IT_SUPPORT receives masked key)
 */
const getLicenseById = asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id).populate(
    "allocations.user",
    "name email department"
  );

  if (!license) {
    throw ApiError.notFound("License not found");
  }

  res.status(200).json({
    success: true,
    data: formatLicense(license, req.user.role, true)
  });
});

/**
 * @desc    Create a new software license
 * @route   POST /api/v1/licenses
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const createLicense = asyncHandler(async (req, res) => {
  const { softwareName, vendor, licenseKey, totalSeats, expiryDate, notes } = req.body;

  const newLicense = await License.create({
    softwareName: String(softwareName).trim(),
    vendor: vendor ? String(vendor).trim() : "",
    licenseKey: String(licenseKey).trim(),
    totalSeats: parseInt(totalSeats, 10),
    allocations: [],
    expiryDate: new Date(expiryDate),
    notes: notes ? String(notes).trim() : ""
  });

  await safeAudit({
    req,
    user: req.user,
    action: "LICENSE_CREATE",
    entity: "LICENSE",
    entityId: newLicense._id.toString(),
    details: `Created license ${newLicense.softwareName}`
  });

  res.status(201).json({
    success: true,
    data: formatLicense(newLicense, req.user.role, true)
  });
});

/**
 * @desc    Update software license details and seat allocations
 * @route   PUT /api/v1/licenses/:id
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const updateLicense = asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id);
  if (!license) {
    throw ApiError.notFound("License not found");
  }

  // Validate totalSeats not reduced below currently used seats
  if (req.body.totalSeats !== undefined) {
    const seats = parseInt(req.body.totalSeats, 10);
    const currentUsedSeats = Array.isArray(license.allocations) ? license.allocations.length : 0;
    if (seats < currentUsedSeats) {
      throw ApiError.badRequest(
        `Total seats (${seats}) cannot be less than currently allocated seats (${currentUsedSeats})`,
        [{ field: "totalSeats", message: "Cannot reduce total seats below current allocated count" }]
      );
    }
    license.totalSeats = seats;
  }

  if (req.body.softwareName !== undefined) {
    license.softwareName = String(req.body.softwareName).trim();
  }

  if (req.body.vendor !== undefined) {
    license.vendor = String(req.body.vendor).trim();
  }

  if (req.body.licenseKey !== undefined) {
    license.licenseKey = String(req.body.licenseKey).trim();
  }

  if (req.body.expiryDate !== undefined) {
    license.expiryDate = new Date(req.body.expiryDate);
  }

  if (req.body.notes !== undefined) {
    license.notes = String(req.body.notes).trim();
  }

  await license.save();
  await license.populate("allocations.user", "name email department");

  await safeAudit({
    req,
    user: req.user,
    action: "LICENSE_UPDATE",
    entity: "LICENSE",
    entityId: license._id.toString(),
    details: `Updated license ${license.softwareName}`
  });

  res.status(200).json({
    success: true,
    data: formatLicense(license, req.user.role, true)
  });
});

/**
 * @desc    Allocate a license seat to an active user
 * @route   POST /api/v1/licenses/:id/allocate
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const allocateSeat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw ApiError.notFound("User not found");
  }

  if (!targetUser.isActive) {
    throw ApiError.badRequest("Cannot allocate license seat to an inactive user");
  }

  const license = await License.findById(req.params.id);
  if (!license) {
    throw ApiError.notFound("License not found");
  }

  // Check if user already holds a seat
  const alreadyAllocated = license.allocations.some(
    (a) => a.user && a.user.toString() === targetUser._id.toString()
  );
  if (alreadyAllocated) {
    throw ApiError.conflict("User is already allocated a seat for this license");
  }

  // Check seat capacity
  if (license.allocations.length >= license.totalSeats) {
    throw ApiError.badRequest("No seats available");
  }

  // Atomic conditional update ensuring concurrency safety
  const updatedLicense = await License.findOneAndUpdate(
    {
      _id: license._id,
      $expr: { $lt: [{ $size: "$allocations" }, "$totalSeats"] },
      "allocations.user": { $ne: targetUser._id }
    },
    {
      $push: {
        allocations: {
          user: targetUser._id,
          allocatedAt: new Date()
        }
      }
    },
    { new: true }
  ).populate("allocations.user", "name email department");

  if (!updatedLicense) {
    // Determine exact cause for graceful error reporting
    const freshDoc = await License.findById(license._id);
    if (!freshDoc) throw ApiError.notFound("License not found");
    if (freshDoc.allocations.some((a) => a.user && a.user.toString() === targetUser._id.toString())) {
      throw ApiError.conflict("User is already allocated a seat for this license");
    }
    throw ApiError.badRequest("No seats available");
  }

  await safeAudit({
    req,
    user: req.user,
    action: "LICENSE_ALLOCATE",
    entity: "LICENSE",
    entityId: updatedLicense._id.toString(),
    details: `Allocated seat to ${targetUser.name}`
  });

  res.status(200).json({
    success: true,
    data: formatLicense(updatedLicense, req.user.role, true)
  });
});

/**
 * @desc    Release an allocated license seat from a user
 * @route   DELETE /api/v1/licenses/:id/allocate/:userId
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const releaseSeat = asyncHandler(async (req, res) => {
  const license = await License.findById(req.params.id);
  if (!license) {
    throw ApiError.notFound("License not found");
  }

  const allocation = license.allocations.find(
    (a) => a.user && a.user.toString() === req.params.userId.toString()
  );
  if (!allocation) {
    throw ApiError.notFound("User is not allocated a seat for this license");
  }

  const updatedLicense = await License.findOneAndUpdate(
    { _id: license._id, "allocations.user": req.params.userId },
    { $pull: { allocations: { user: req.params.userId } } },
    { new: true }
  ).populate("allocations.user", "name email department");

  const targetUser = await User.findById(req.params.userId);
  const userName = targetUser ? targetUser.name : req.params.userId;

  await safeAudit({
    req,
    user: req.user,
    action: "LICENSE_RELEASE",
    entity: "LICENSE",
    entityId: updatedLicense._id.toString(),
    details: `Released seat for ${userName}`
  });

  res.status(200).json({
    success: true,
    data: formatLicense(updatedLicense, req.user.role, true)
  });
});

module.exports = {
  getLicenses,
  getExpiringLicenses,
  getLicenseById,
  createLicense,
  updateLicense,
  allocateSeat,
  releaseSeat,
  maskLicenseKey
};
