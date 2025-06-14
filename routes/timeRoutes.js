import express from "express";
import { getServerTime } from "../controllers/timeController.js";

const router = express.Router();

// Route to get current UTC server time
router.get("/", getServerTime);

export default router;