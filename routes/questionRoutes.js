import express from "express";
import {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";
import { adminProtect } from "../middleware/adminProtect.js";

const router = express.Router();

// Route to create a new question
router.post("/create", adminProtect, createQuestion);

// Route to retrieve all questions
router.get("/all", getAllQuestions);

// Route to retrieve a question by its ID
router.get("/detail/:id", getQuestionById);

// Route to update a specific question by its ID
router.put("/update/:id", adminProtect, updateQuestion);

// Route to delete a specific question by its ID
router.delete("/delete/:id", adminProtect, deleteQuestion);

export default router;
