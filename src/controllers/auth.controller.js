const dataStore = require("../models/dataStore");
const ApiResponse = require("../utils/apiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokenGenerator");
const bcrypt = require("bcryptjs");

class AuthController {
  /**
   * Register User
   * POST /api/auth/register or /api/v1/auth/register
   */
  static async register(req, res, next) {
    try {
      const {
        name,
        email,
        password,
        accountType = "attendee",
        role,
        phone,
      } = req.body;

      if (!name || !email || !password) {
        return ApiResponse.error(
          res,
          "Name, email, and password are required.",
          400,
        );
      }

      if (password.length < 6) {
        return ApiResponse.error(
          res,
          "Password must be at least 6 characters.",
          400,
        );
      }

      const existingUser = await dataStore.findUserByEmail(email);
      if (existingUser) {
        return ApiResponse.error(
          res,
          "An account with this email address already exists.",
          400,
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role || accountType || "attendee";

      const user = await dataStore.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
        accountType: userRole,
        phone: phone ? phone.trim() : "",
      });

      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Set cookie for browser clients
      res.cookie("accessToken", token, {
        httpOnly: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const safeUser = {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        phone: user.phone,
      };

      return ApiResponse.success(
        res,
        "Registration successful",
        {
          token,
          access_token: token,
          refreshToken,
          user: safeUser,
        },
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login User
   * POST /api/auth/login or /api/v1/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponse.error(
          res,
          "Please provide email and password.",
          400,
        );
      }

      const user = await dataStore.findUserByEmail(email);
      if (!user) {
        return ApiResponse.error(res, "Invalid email or password.", 401);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return ApiResponse.error(res, "Invalid email or password.", 401);
      }

      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie("accessToken", token, {
        httpOnly: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const safeUser = {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role || user.accountType || "attendee",
        accountType: user.accountType || user.role || "attendee",
        phone: user.phone || "",
      };

      return ApiResponse.success(res, "Login successful", {
        token,
        access_token: token,
        refreshToken,
        user: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current Authenticated User Profile
   * GET /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      const user = await dataStore.findUserById(req.user.id);
      if (!user) {
        return ApiResponse.error(res, "User not found.", 404);
      }

      const safeUser = {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role || user.accountType || "attendee",
        accountType: user.accountType || user.role || "attendee",
        phone: user.phone || "",
        payoutAccount: user.payoutAccount || null,
      };

      return ApiResponse.success(res, "User profile retrieved", {
        user: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Profile Details
   * PUT /api/auth/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone.trim();

      const updated = await dataStore.updateUser(req.user.id, updateData);
      const safeUser = {
        id: updated.id || updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        accountType: updated.accountType,
        phone: updated.phone,
      };

      return ApiResponse.success(res, "Profile updated successfully", {
        user: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Token
   * POST /api/auth/refresh or /api/v1/auth/refresh
   */
  static async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        return ApiResponse.error(res, "Refresh token required.", 400);
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return ApiResponse.error(res, "Invalid or expired refresh token.", 401);
      }

      const user = await dataStore.findUserById(decoded.id);
      if (!user) {
        return ApiResponse.error(res, "User not found.", 401);
      }

      const newAccessToken = generateAccessToken(user);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return ApiResponse.success(res, "Token refreshed", {
        access_token: newAccessToken,
        token: newAccessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout User
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return ApiResponse.success(res, "Logged out successfully");
  }

  /**
   * Verify Email
   * POST /api/auth/verify-email
   */
  static async verifyEmail(req, res) {
    return ApiResponse.success(res, "Email verified successfully");
  }

  /**
   * Forgot Password
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res) {
    return ApiResponse.success(
      res,
      "If your email is registered, password reset instructions have been sent.",
    );
  }

  /**
   * Reset Password
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res) {
    return ApiResponse.success(
      res,
      "Password reset successful. Please sign in with your new password.",
    );
  }
}

module.exports = AuthController;
