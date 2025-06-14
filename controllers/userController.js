import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { google } from "googleapis";
import axios from "axios";

export const loginWithGoogleUser = async (req, res) => {
  const { code } = req.body;

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
    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );
    const { email, name, picture } = userRes.data;

    // 3. Check if the user exists
    let user = await User.findOne({ email });

    if (!user) {
      // New user - handle Google-based signup
      user = await User.create({
        email,
        username: name,
        picture,
        isGoogleLogin: true,
      });
      console.log("New user signed up via Google.");
    } else if (!user.isGoogleLogin) {
      // If the user registered traditionally, update their record for Google login
      user.isGoogleLogin = true;
      user.picture = picture; // Update picture from Google
      await user.save();
      console.log("Existing user enabled Google login.");
    }

    // 4. Generate a JWT token
    const token = generateToken(user._id);

    // 5. Set the JWT as a cookie
    res.cookie("user_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // 6. Respond with success
    res.status(200).json({
      success: true,
      message: "Logged in successfully via Google.",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "An error occurred during Google login.",
    });
  }
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please log in.",
      });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      const token = generateToken(user._id);
      res.cookie("user_jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.status(200).json({
        success: true,
        message: "User registered successfully",
        user,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid user data",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while registering user",
      error: error.message,
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .populate("batches")
      .populate("pendingRequests", "name")
      .exec();

    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user._id);
      res.cookie("user_jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while logging in user",
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = async (req, res) => {
  try {
    res.cookie("user_jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 0,
    });
    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while logging out user",
      error: error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("batches")
      .populate("pendingRequests", "name");

    if (user) {
      res.status(200).json({
        success: true,
        user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching user profile",
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;

      // Update password only if provided in request
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: "User profile updated successfully",
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          score: updatedUser.score,
          token: generateToken(updatedUser._id),
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while updating user profile",
      error: error.message,
    });
  }
};

// @desc    Delete user profile
// @route   DELETE /api/users/profile
// @access  Private
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      await user.remove();
      res.status(200).json({
        success: true,
        message: "User removed successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while deleting user profile",
      error: error.message,
    });
  }
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};
