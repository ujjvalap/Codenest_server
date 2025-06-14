import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import Challenge from "../models/challengeModel.js";
import { google } from "googleapis";
import axios from "axios";

export const loginWithGoogleAdmin = async (req, res) => {
  const {code} = req.body;
  

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  // Initialize oauth2Client
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage"
  );

  try {
    // 1. Exchange the authorization code for tokens
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    // 2. Fetch user details from Google
    const adminRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );
    const { email, name, picture } = adminRes.data;

    // 3. Check if the admin exists
    let admin = await Admin.findOne({ email });

    if (!admin) {
      // New user - handle Google-based signup
      admin = await Admin.create({
        email,
        username: name,
        picture,
        isGoogleLogin: true,
      });
      console.log("New user signed up via Google.");
    } else if (!admin.isGoogleLogin) {
      // If the user registered traditionally, update their record for Google login
      admin.isGoogleLogin = true;
      admin.picture = picture; // Update picture from Google
      await admin.save();
      console.log("Existing user enabled Google login.");
    }

    // 4. Generate a JWT token
    const token = generateToken(admin._id);

    // 5. Set the JWT as a cookie
    res.cookie("admin_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // 6. Respond with success
    res.status(200).json({
      success: true,
      message: "Logged in successfully via Google.",
      host: admin,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "An error occurred during Google login.",
    });
  }
};

// @desc    Register a new admin
// @route   POST /api/admin/register
// @access  Public
export const registerAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const adminExists = await Admin.findOne({ email: email });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists. Please log in.",
      });
    }

    const admin = await Admin.create({
      username,
      email,
      password,
    });

    const token = generateToken(admin._id);

    res.cookie("admin_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Admin registered successfully",
      host: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register Admin",
      error: error.message,
    });
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email }).populate("challengesCreated batches");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(admin._id);

    res.cookie("admin_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: `Welcome Back, ${admin.username}`,
      host: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get challenges created by the admin
// @route   GET /api/admin/challenges
// @access  Private (Admin only)
export const getAdminChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      createdBy: req.admin._id,
    }).populate("questions participants");

    res.status(200).json({
      success: true,
      challenges,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove a challenge from admin's list and delete the challenge
// @route   PUT /api/challenge/delete/:challengeId
// @access  Private (Admin only)
export const deleteChallengeFromAdmin = async (req, res) => {
  const { challengeId } = req.params;
  const adminId = req.admin._id;

  try {
    const challenge = await Challenge.findByIdAndDelete(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    const host = await Admin.findByIdAndUpdate(
      adminId,
      { $pull: { challengesCreated: challengeId } },
      { new: true }
    ).populate("challengesCreated batches");

    res.status(200).json({
      success: true,
      message: "Challenge deleted successfully",
      host,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id)
      .select("-password")
      .populate("challengesCreated batches");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      host: admin,
      message: `Welcome Back, ${admin.username}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);

    if (admin) {
      admin.username = req.body.username || admin.username;
      admin.email = req.body.email || admin.email;

      if (req.body.password) {
        admin.password = req.body.password;
      }

      const updatedAdmin = await admin.save();

      res.status(200).json({
        success: true,
        message: "Admin profile updated successfully",
        host: {
          _id: updatedAdmin._id,
          username: updatedAdmin.username,
          email: updatedAdmin.email,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete admin profile
// @route   DELETE /api/admin/profile
// @access  Private
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (admin) {
      await admin.remove();
      res.status(200).json({
        success: true,
        message: "Admin removed",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout admin
// @route   POST /api/admin/logout
// @access  Private
export const logoutAdmin = async (req, res) => {
  try {
    res.cookie("admin_jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 0,
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};
