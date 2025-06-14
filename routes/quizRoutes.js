import express from "express";
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizLeaderboard,
  getQuizAnalytics,
} from "../controllers/quizController.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { getUserQuizSubmission, initializeSubmission } from "../controllers/quizSubmitQuestionController.js";

const router = express.Router();

router.post("/:id", adminProtect, createQuiz);
router.get("/", getQuizzes);
router.get("/:id", getQuizById);
router.put("/:id", adminProtect, updateQuiz);
router.delete("/:id", adminProtect, deleteQuiz);


// Route to get a specific user's quiz submission
router.post("/sumbission/initialize", initializeSubmission); // Initialize quiz submission

router.get("/submit/user/:userId/quiz/:quizId", getUserQuizSubmission);

router.get("/leaderboard/:quizId", adminProtect, getQuizLeaderboard);

router.get("/quizAnalytics/:quizId", adminProtect, getQuizAnalytics);

export default router;
