// Purpose: Hardware asset inventory controller implementing Module M2 operations
const { Asset, User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { safeAudit } = require("../middleware/audit");

/**
 * @desc    Get paginated hardware assets with search, filtering, and sorting
 * @route   GET /api/v1/assets
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const getAssets = asyncHandler(async (req, res) => {
  const query = {};
  const searchTerm = req.query.q || req.query.search;

  if (searchTerm && typeof searchTerm === "string" && searchTerm.trim() !== "") {
    const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { assetTag: { $regex: escaped, $options: "i" } },
      { serialNumber: { $regex: escaped, $options: "i" } },
      { name: { $regex: escaped, $options: "i" } }
    ];
  }

  if (
    req.query.category &&
    ["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"].includes(
      req.query.category
    )
  ) {
    query.category = req.query.category;
  }

  if (
    req.query.status &&
    ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"].includes(req.query.status)
  ) {
    query.status = req.query.status;
  }

  if (req.query.assigned !== undefined && req.query.assigned !== "") {
    const assignedVal = String(req.query.assigned).toLowerCase().trim();
    if (assignedVal === "yes" || assignedVal === "true") {
      query.assignedTo = { $ne: null };
    } else if (assignedVal === "no" || assignedVal === "false") {
      query.assignedTo = null;
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const allowedSorts = {
    createdAt: { createdAt: 1 },
    "-createdAt": { createdAt: -1 },
    name: { name: 1 },
    "-name": { name: -1 },
    assetTag: { assetTag: 1 },
    "-assetTag": { assetTag: -1 }
  };
  const sortOption = allowedSorts[req.query.sort] || { createdAt: -1 };

  const total = await Asset.countDocuments(query);
  const assets = await Asset.find(query)
    .populate("assignedTo", "name email")
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: assets,
    meta: {
      page,
      limit,
      total
    }
  });
});

/**
 * @desc    Get assets assigned to the currently authenticated user
 * @route   GET /api/v1/assets/mine
 * @access  Private (All authenticated roles)
 */
const getMyAssets = asyncHandler(async (req, res) => {
  const assets = await Asset.find({ assignedTo: req.user._id })
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: assets
  });
});

/**
 * @desc    Create a new hardware asset
 * @route   POST /api/v1/assets
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const createAsset = asyncHandler(async (req, res) => {
  const { serialNumber, name, category, purchaseDate, warrantyExpiry, notes } = req.body;
  const trimmedSerial = serialNumber ? String(serialNumber).trim() : "";

  const existing = await Asset.findOne({ serialNumber: trimmedSerial });
  if (existing) {
    throw ApiError.conflict("Serial number already registered", [
      { field: "serialNumber", message: "Serial number already registered" }
    ]);
  }

  const newAsset = await Asset.create({
    serialNumber: trimmedSerial,
    name: String(name).trim(),
    category,
    status: "AVAILABLE",
    assignedTo: null,
    purchaseDate: purchaseDate || null,
    warrantyExpiry: warrantyExpiry || null,
    notes: notes ? String(notes).trim() : ""
  });

  await safeAudit({
    req,
    user: req.user,
    action: "ASSET_CREATE",
    entity: "ASSET",
    entityId: newAsset._id.toString(),
    details: `Created asset ${newAsset.assetTag} (${newAsset.name})`
  });

  res.status(201).json({
    success: true,
    data: newAsset
  });
});

/**
 * @desc    Get single hardware asset by ID
 * @route   GET /api/v1/assets/:id
 * @access  Private (ADMIN, IT_SUPPORT, or EMPLOYEE if assigned to them)
 */
const getAssetById = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id).populate("assignedTo", "name email");
  if (!asset) {
    throw ApiError.notFound("Asset not found");
  }

  // Role check: Employees can only view assets assigned to them
  if (req.user.role === "EMPLOYEE") {
    const isAssignedToUser =
      asset.assignedTo &&
      (asset.assignedTo._id
        ? asset.assignedTo._id.toString() === req.user._id.toString()
        : asset.assignedTo.toString() === req.user._id.toString());

    if (!isAssignedToUser) {
      throw ApiError.forbidden("Access denied: You can only view assets assigned to you");
    }
  }

  res.status(200).json({
    success: true,
    data: asset
  });
});

/**
 * @desc    Update editable hardware asset fields
 * @route   PUT /api/v1/assets/:id
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    throw ApiError.notFound("Asset not found");
  }

  // RETIRED assets accept only notes updates
  if (asset.status === "RETIRED") {
    const hasNonNotesField = Object.keys(req.body).some(
      (key) => key !== "notes" && req.body[key] !== undefined
    );
    if (hasNonNotesField) {
      throw ApiError.badRequest("Retired assets cannot be edited except notes", [
        { field: "status", message: "Retired assets only permit updating the notes field" }
      ]);
    }
    if (req.body.notes !== undefined) {
      asset.notes = req.body.notes ? String(req.body.notes).trim() : "";
    }
  } else {
    // Non-retired assets: editable fields name, category, purchaseDate, warrantyExpiry, notes, serialNumber
    if (req.body.serialNumber !== undefined) {
      const trimmedSerial = String(req.body.serialNumber).trim();
      if (trimmedSerial !== asset.serialNumber) {
        const existing = await Asset.findOne({
          serialNumber: trimmedSerial,
          _id: { $ne: asset._id }
        });
        if (existing) {
          throw ApiError.conflict("Serial number already registered", [
            { field: "serialNumber", message: "Serial number already registered" }
          ]);
        }
        asset.serialNumber = trimmedSerial;
      }
    }

    if (req.body.name !== undefined) {
      asset.name = String(req.body.name).trim();
    }

    if (req.body.category !== undefined) {
      asset.category = req.body.category;
    }

    if (req.body.purchaseDate !== undefined) {
      asset.purchaseDate = req.body.purchaseDate || null;
    }

    if (req.body.warrantyExpiry !== undefined) {
      asset.warrantyExpiry = req.body.warrantyExpiry || null;
    }

    if (req.body.notes !== undefined) {
      asset.notes = req.body.notes ? String(req.body.notes).trim() : "";
    }
  }

  await asset.save();
  await asset.populate("assignedTo", "name email");

  await safeAudit({
    req,
    user: req.user,
    action: "ASSET_UPDATE",
    entity: "ASSET",
    entityId: asset._id.toString(),
    details: `Updated asset ${asset.assetTag}`
  });

  res.status(200).json({
    success: true,
    data: asset
  });
});

/**
 * @desc    Assign an available hardware asset to an active user
 * @route   PATCH /api/v1/assets/:id/assign
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const assignAsset = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw ApiError.notFound("User not found");
  }

  if (!targetUser.isActive) {
    throw ApiError.badRequest("Cannot assign asset to an inactive user");
  }

  // Atomic conditional update ensuring only an AVAILABLE asset is assigned
  const asset = await Asset.findOneAndUpdate(
    { _id: req.params.id, status: "AVAILABLE" },
    { $set: { status: "ASSIGNED", assignedTo: targetUser._id } },
    { new: true }
  ).populate("assignedTo", "name email");

  if (!asset) {
    const exists = await Asset.findById(req.params.id);
    if (!exists) {
      throw ApiError.notFound("Asset not found");
    }
    throw ApiError.badRequest("Asset is not available");
  }

  await safeAudit({
    req,
    user: req.user,
    action: "ASSET_ASSIGN",
    entity: "ASSET",
    entityId: asset._id.toString(),
    details: `to ${targetUser.name}`
  });

  res.status(200).json({
    success: true,
    data: asset
  });
});

/**
 * @desc    Unassign an assigned hardware asset
 * @route   PATCH /api/v1/assets/:id/unassign
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const unassignAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    throw ApiError.notFound("Asset not found");
  }

  if (asset.status !== "ASSIGNED") {
    throw ApiError.badRequest("Only assigned assets can be unassigned");
  }

  asset.status = "AVAILABLE";
  asset.assignedTo = null;
  await asset.save();

  await safeAudit({
    req,
    user: req.user,
    action: "ASSET_UNASSIGN",
    entity: "ASSET",
    entityId: asset._id.toString(),
    details: `Unassigned asset ${asset.assetTag}`
  });

  res.status(200).json({
    success: true,
    data: asset
  });
});

/**
 * @desc    Update hardware asset status (AVAILABLE, MAINTENANCE, RETIRED)
 * @route   PATCH /api/v1/assets/:id/status
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const updateAssetStatus = asyncHandler(async (req, res) => {
  const { status: newStatus } = req.body;

  if (!["AVAILABLE", "MAINTENANCE", "RETIRED"].includes(newStatus)) {
    throw ApiError.badRequest(
      "Invalid status. Allowed values are AVAILABLE, MAINTENANCE, or RETIRED (use assign endpoint for ASSIGNED)"
    );
  }

  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    throw ApiError.notFound("Asset not found");
  }

  if (asset.status === "RETIRED") {
    throw ApiError.badRequest("Retired assets cannot change status");
  }

  const oldStatus = asset.status;
  asset.status = newStatus;

  // MAINTENANCE, RETIRED, or AVAILABLE clear assignedTo
  if (newStatus === "MAINTENANCE" || newStatus === "RETIRED" || newStatus === "AVAILABLE") {
    asset.assignedTo = null;
  }

  await asset.save();

  await safeAudit({
    req,
    user: req.user,
    action: "ASSET_STATUS",
    entity: "ASSET",
    entityId: asset._id.toString(),
    details: `from ${oldStatus} to ${newStatus}`
  });

  res.status(200).json({
    success: true,
    data: asset
  });
});

module.exports = {
  getAssets,
  getMyAssets,
  createAsset,
  getAssetById,
  updateAsset,
  assignAsset,
  unassignAsset,
  updateAssetStatus
};
