import express from "express";
import {userProtect} from "../middleware/userProtect.js"; 
import { submitQuestion } from "../controllers/quizSubmitQuestionController.js";

const router = express.Router();

router.post("/submit", userProtect, submitQuestion);

export default router;
