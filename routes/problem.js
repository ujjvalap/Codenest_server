// routes/problem.js
import express from "express";
import { getProblemOfTheDay } from "../controllers/problemController.js";

const router = express.Router();

router.get("/problem-of-the-day", getProblemOfTheDay);

export default router;
