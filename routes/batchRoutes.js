import express from "express";
import {
  createBatch,
  deleteBatch,
  getBatchById,
  getBatches,
  getStudentQuizPerformance,
  manageJoinRequest,
  requestJoinBatch,
  updateBatch,
} from "../controllers/batchController.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { userProtect } from "../middleware/userProtect.js";

const router = express.Router();

// Create a new batch (Admin only)
router.post("/", adminProtect, createBatch);

// Student requests to join a batch
router.post("/join", userProtect, requestJoinBatch);

// Admin approves/rejects join requests
router.post("/manageRequest/:batchId", adminProtect, manageJoinRequest);

// Get all batches (for admins)
router.get("/", adminProtect, getBatches);

// Get a single batch by ID (Admin or User can access)
router.get("/:batchId", getBatchById);

// Update a batch (Admin only)
router.put("/:id", adminProtect, updateBatch);

// Delete the batch (Admin only)
router.delete("/:id", adminProtect, deleteBatch);

router.get("/:batchId/performance", getStudentQuizPerformance);

export default router;
