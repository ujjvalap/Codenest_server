import express from "express";
import {
  deleteSubmission,
  getChallengeQuestionSubmissionsByUser,
  getUserSubmissions,
  submitSolution
} from "../controllers/submissionController.js";
import { adminProtect } from "../middleware/adminProtect.js"; // Middleware to verify admin access
import { userProtect } from "../middleware/userProtect.js"; // Middleware to verify user access

const router = express.Router();

// Route to create a new submission
// Protected by `userProtect` middleware to ensure that only logged-in users can create submissions
router.post("/", userProtect, submitSolution);

// Route to get submissions for a specific challenge question by user
router.get(
  "/challenge/:challengeId/question/:questionId",
  userProtect,
  getChallengeQuestionSubmissionsByUser
);

// Route to get submissions for a specific user
// Only accessible by the authenticated user themselves
router.get("/user", userProtect, getUserSubmissions);


// Route to delete a submission
// Protected by `adminProtect` so only admins can delete submissions
router.delete("/:id", adminProtect, deleteSubmission);

export default router;
