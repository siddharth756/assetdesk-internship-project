// Purpose: Authentication controller handling login, profile inspection, and password updates
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config/env");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { safeAudit } = require("../middleware/audit");

/**
 * @desc    Authenticate user and return JWT token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    await safeAudit({
      userName: typeof email === "string" ? email : "Unknown",
      action: "LOGIN_FAILED",
      entity: "AUTH",
      details: `Failed login attempt: user not found (${email})`,
      req
    });
    throw ApiError.unauthorized("Invalid email or password");
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    await safeAudit({
      user,
      userName: user.name,
      action: "LOGIN_FAILED",
      entity: "AUTH",
      entityId: user._id.toString(),
      details: `Failed login attempt: incorrect password for ${email}`,
      req
    });
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    await safeAudit({
      user,
      userName: user.name,
      action: "LOGIN_FAILED",
      entity: "AUTH",
      entityId: user._id.toString(),
      details: `Failed login attempt: user account is deactivated for ${email}`,
      req
    });
    throw ApiError.unauthorized("Account is deactivated. Please contact an administrator.");
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN, algorithm: "HS256" }
  );

  await safeAudit({
    user,
    userName: user.name,
    action: "LOGIN",
    entity: "AUTH",
    entityId: user._id.toString(),
    details: "User logged in successfully",
    req
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      user: user.toJSON()
    }
  });
});

/**
 * @desc    Get authenticated user profile
 * @route   GET /api/v1/auth/me
 * @access  Private (All authenticated roles)
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/v1/auth/change-password
 * @access  Private (All authenticated roles)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user) {
    throw ApiError.unauthorized("User session invalid");
  }

  const isCurrentValid = await user.comparePassword(currentPassword);
  if (!isCurrentValid) {
    throw ApiError.badRequest("Current password is incorrect", [
      { field: "currentPassword", message: "Current password does not match" }
    ]);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  await safeAudit({
    user: req.user,
    userName: req.user.name,
    action: "PASSWORD_CHANGE",
    entity: "AUTH",
    entityId: req.user._id.toString(),
    details: "Password changed successfully",
    req
  });

  res.status(200).json({
    success: true,
    data: {
      message: "Password changed successfully"
    }
  });
});

module.exports = {
  login,
  getMe,
  changePassword
};
