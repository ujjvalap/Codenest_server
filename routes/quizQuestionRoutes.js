import express from "express";
import {
  createMultipleQuestions,
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
} from "../controllers/quizQuestionController.js";
import { submitQuestion } from "../controllers/quizSubmitQuestionController.js";
import { adminProtect } from "../middleware/adminProtect.js";
import { userProtect } from "../middleware/userProtect.js";

const router = express.Router();

// Route to create a question
router.post("/", adminProtect, createQuestion);

// Route to create multiple questions
router.post("/create-multiple", adminProtect, createMultipleQuestions);

// Route to get all questions
router.get("/", adminProtect, getQuestions);

// Route to get a single question by ID
router.get("/:id", adminProtect, getQuestionById);

// Route to update a question
router.put("/:id", adminProtect, updateQuestion);

// Route to delete a question
router.delete("/:id", adminProtect, deleteQuestion);

// Route to submit the question
router.post("/submit", userProtect, submitQuestion);


export default router;
