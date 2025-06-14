import express from "express";
import {
  createTestCase,
  getTestCasesForQuestion,
  updateTestCase,
  deleteTestCase,
} from "../controllers/testCaseController.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

// Route to add a test case to a specific question
router.post("/questions/:id/testcases", adminProtect, createTestCase);

// Route to get all test cases for a specific question
router.get("/questions/:id/testcases", getTestCasesForQuestion);

// Route to update a specific test case by its ID
router.put("/testcases/:id", adminProtect, updateTestCase);

// Route to delete a specific test case by its ID
router.delete("/testcases/:id", adminProtect, deleteTestCase);

export default router;
