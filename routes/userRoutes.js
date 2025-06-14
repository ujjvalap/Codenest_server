import express from "express";
import {
  deleteUser,
  getUserProfile,
  loginUser,
  loginWithGoogleUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from "../controllers/userController.js";
import { userProtect } from "../middleware/userProtect.js";

const router = express.Router();

router.post("/loginWithGoogle", loginWithGoogleUser);

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/users/login
// @desc    Authenticate user and get token
// @access  Public
router.post("/login", loginUser);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", userProtect, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", userProtect, updateUserProfile);

// @route   DELETE /api/users/profile
// @desc    Delete user account
// @access  Private
router.delete("/profile", userProtect, deleteUser);

router.post("/logout", userProtect, logoutUser);

export default router;
