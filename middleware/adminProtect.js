import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

export const adminProtect = async (req, res, next) => {
  try {
    const token = req.cookies.admin_jwt;
    
    
    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Not authorized, admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
