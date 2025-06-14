import { adminProtect } from "./adminProtect.js";
import { userProtect } from "./userProtect.js";

export const adminOrUserProtect = async (req, res, next) => {
  try {
    // Try user authentication
    await userProtect(req, res, async () => {
      req.isUser = true; // Mark as user
      return next(); // If successful, allow access
    });
  } catch (userError) {
    try {
      // If user authentication fails, try admin authentication
      await adminProtect(req, res, async () => {
        req.isAdmin = true; // Mark as admin
        return next(); // If successful, allow access
      });
    } catch (adminError) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or authenticated user required.",
      });
    }
  }
};
