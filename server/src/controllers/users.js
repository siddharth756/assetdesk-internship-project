// Purpose: User management controller handling user listing, creation, updates, and status toggles
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { safeAudit } = require("../middleware/audit");

/**
 * @desc    Get paginated list of users with search and filter options
 * @route   GET /api/v1/users
 * @access  Private (ADMIN only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const query = {};
  const searchTerm = req.query.search || req.query.q;

  if (searchTerm && typeof searchTerm === "string") {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } }
    ];
  }

  if (req.query.role && ["ADMIN", "IT_SUPPORT", "EMPLOYEE"].includes(req.query.role)) {
    query.role = req.query.role;
  }

  if (req.query.isActive !== undefined && req.query.isActive !== "") {
    if (req.query.isActive === "true" || req.query.isActive === true) {
      query.isActive = true;
    } else if (req.query.isActive === "false" || req.query.isActive === false) {
      query.isActive = false;
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  res.status(200).json({
    success: true,
    data: users,
    meta: {
      page,
      limit,
      total
    }
  });
});

/**
 * @desc    Create a new user
 * @route   POST /api/v1/users
 * @access  Private (ADMIN only)
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, isActive } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict(`User with email '${normalizedEmail}' already exists`, [
      { field: "email", message: "Email already in use" }
    ]);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: role || "EMPLOYEE",
    department: department || "",
    isActive: isActive !== undefined ? Boolean(isActive) : true
  });

  await safeAudit({
    user: req.user,
    userName: req.user.name,
    action: "USER_CREATE",
    entity: "USER",
    entityId: newUser._id.toString(),
    details: `Created user ${newUser.email} with role ${newUser.role}`,
    req
  });

  res.status(201).json({
    success: true,
    data: newUser
  });
});

/**
 * @desc    Get single user details by ID
 * @route   GET /api/v1/users/:id
 * @access  Private (ADMIN only)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user details (name, department, role)
 * @route   PUT /api/v1/users/:id
 * @access  Private (ADMIN only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, department, role } = req.body;

  // Rule 7: Admin cannot demote their own account
  if (req.user._id.toString() === id && role && role !== "ADMIN") {
    throw ApiError.badRequest("Admin cannot demote their own account", [
      { field: "role", message: "Admin cannot demote their own account" }
    ]);
  }

  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (name !== undefined) user.name = name;
  if (department !== undefined) user.department = department;
  if (role !== undefined) user.role = role;

  await user.save();

  await safeAudit({
    user: req.user,
    userName: req.user.name,
    action: "USER_UPDATE",
    entity: "USER",
    entityId: user._id.toString(),
    details: `Updated user details for ${user.email} (role: ${user.role})`,
    req
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Toggle active status of a user
 * @route   PATCH /api/v1/users/:id/status
 * @access  Private (ADMIN only)
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  // Rule 7: Admin cannot deactivate their own account
  if (req.user._id.toString() === id && isActive === false) {
    throw ApiError.badRequest("Admin cannot deactivate their own account", [
      { field: "isActive", message: "Admin cannot deactivate their own account" }
    ]);
  }

  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  user.isActive = Boolean(isActive);
  await user.save();

  await safeAudit({
    user: req.user,
    userName: req.user.name,
    action: "USER_STATUS",
    entity: "USER",
    entityId: user._id.toString(),
    details: `Updated user ${user.email} status to ${user.isActive ? "active" : "inactive"}`,
    req
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Lookup active users list for dropdowns
 * @route   GET /api/v1/users/lookup
 * @access  Private (ADMIN, IT_SUPPORT)
 */
const lookupUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true })
    .select("_id name email role department")
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: users
  });
});

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateUserStatus,
  lookupUsers
};
