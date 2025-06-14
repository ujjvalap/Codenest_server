import express from "express";
import {
  addQuestionToChallenge,
  calculateLeaderboard,
  createChallenge,
  deleteChallenge,
  endContest,
  getAllChallenges,
  getChallengeById,
  getChallengeProgress,
  getLeaderboard,
  joinChallengeWithKey,
  removeQuestionFromChallenge,
  updateChallenge,
} from "../controllers/challengeController.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { userProtect } from "../middleware/userProtect.js";

const router = express.Router();

// Routes with `adminProtect` middleware for admin-only actions
router.post("/create", adminProtect, createChallenge);
router.put("/:id/add-question", adminProtect, addQuestionToChallenge);
router.delete(
  "/:id/remove-question",
  adminProtect,
  removeQuestionFromChallenge
);
router.get("/all", adminProtect, getAllChallenges);
router.put("/:id/update", adminProtect, updateChallenge);
router.delete("/:id/delete", adminProtect, deleteChallenge);
router.post("/leaderboard/:id", adminProtect, calculateLeaderboard);
router.get("/leaderboard/:id", adminProtect, getLeaderboard);

// Route with `userProtect` middleware for user-only action
router.post("/join", userProtect, joinChallengeWithKey);
router.post("/end", userProtect, endContest);
// router.post("/progress", userProtect, updateChallengeProgress); // Route for updating progress
router.get("/progress/:challengeID", userProtect, getChallengeProgress); // Route for fetching progress

// Route accessible by both admins and users for viewing a challenge
router.get("/:id", getChallengeById);

export default router;
