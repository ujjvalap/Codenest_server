import Quiz from "../models/quizModel.js";
import Batch from "../models/batchModel.js";
import Submission from "../models/quizSubmissionModel.js";
import Question from "../models/quizQuestionModel.js";
import User from "../models/userModel.js";

/**
 * @desc Create a new quiz
 * @route POST /api/quizzes
 * @access Admin/Teacher
 */
export const createQuiz = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      startTime,
      endTime,
      duration,
      maxAttempts,
      totalMarks,
    } = req.body;

    const batchID = req.params.id

    // Check for missing fields
    if (
      !name ||
      !description ||
      // !subject ||
      !startTime ||
      !endTime
      // !duration ||
      // !totalMarks
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required! bsdk" });
    }

    // Check if batch exists
    const batchExists = await Batch.findById(batchID);
    if (!batchExists)
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });

    // Create new quiz
    const quiz = new Quiz({
      name,
      description,
      subject,
      batch: batchID,
      createdBy: req.admin._id,
      startTime,
      endTime,
      duration,
      maxAttempts,
      totalMarks,
    });

    await quiz.save();

    // Push quiz ID to batch's quizzes array
    batchExists.quizzes.push(quiz._id);
    await batchExists.save();

    res
      .status(201)
      .json({ success: true, message: "Quiz created successfully", quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all quizzes (with optional filters)
 * @route GET /api/quizzes
 * @access Public
 */
export const getQuizzes = async (req, res) => {
  try {
    const { batch, subject, status } = req.query;
    const filters = {};

    if (batch) filters.batch = batch;
    if (subject) filters.subject = subject;
    if (status) filters.status = status;

    const quizzes = await Quiz.find(filters).populate("batch createdBy");
    res.status(200).json({
      success: true,
      message: "Quizzes retrieved successfully",
      quizzes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get a single quiz by ID
 * @route GET /api/quizzes/:id
 * @access Public
 */
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate(
      "batch createdBy questions"
    );
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    res
      .status(200)
      .json({ success: true, message: "Quiz retrieved successfully", quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update a quiz (Only admin/teacher)
 * @route PUT /api/quizzes/:id
 * @access Admin/Teacher
 */
export const updateQuiz = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      batch,
      startTime,
      endTime,
      duration,
      totalMarks,
    } = req.body;

    // Check for missing fields
    if (
      !name ||
      !description ||
      // !subject ||
      // !batch ||
      !startTime ||
      !endTime
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    // if (quiz.createdBy.toString() !== req.admin._id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to update this quiz",
    //   });
    // }

    Object.assign(quiz, req.body);
    await quiz.save();
    res
      .status(200)
      .json({ success: true, message: "Quiz updated successfully", quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete a quiz (Only admin/teacher)
 * @route DELETE /api/quizzes/:id
 * @access Admin/Teacher
 */
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    // if (quiz.createdBy.toString() !== req.admin._id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to delete this quiz",
    //   });
    // }

    // Remove quiz from batch's quizzes array
    await Batch.findByIdAndUpdate(quiz.batch, { $pull: { quizzes: quiz._id } });

    await quiz.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuizLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Get all submissions for the quiz, sorted by score and time
    const leaderboard = await Submission.find({ quiz: quizId })
      .populate("user", "username") // Get user's name
      .populate("quiz", "name description")
      .sort({ totalScore: -1, totalTimeTaken: 1 }) // Higher score first, lower time first

    if (!leaderboard.length) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for this quiz.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leaderboard fetched successfully",
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaderboard",
      error: error.message,
    });
  }
};

export const getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Get all submissions for this quiz
    const submissions = await Submission.find({ quiz: quizId });

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for this quiz.",
      });
    }

    // Calculate average score & time
    let totalScore = 0;
    let totalTime = 0;
    let questionErrors = {}; // Track incorrect answers per question

    submissions.forEach((submission) => {
      totalScore += submission.totalScore;
      totalTime += submission.totalTimeTaken;

      submission.answers.forEach((answer) => {
        if (!answer.isCorrect) {
          questionErrors[answer.question] =
            (questionErrors[answer.question] || 0) + 1;
        }
      });
    });

    const avgScore = totalScore / submissions.length;
    const avgTime = totalTime / submissions.length;

    // Find the most incorrectly answered question
    let mostIncorrectQuestionId = Object.keys(questionErrors).reduce((a, b) =>
      questionErrors[a] > questionErrors[b] ? a : b
    );

    const mostIncorrectQuestion = mostIncorrectQuestionId
      ? await Question.findById(mostIncorrectQuestionId).select("text")
      : null;

    res.status(200).json({
      success: true,
      message: "Quiz analytics fetched successfully",
      averageScore: avgScore.toFixed(2),
      averageTimeTaken: avgTime.toFixed(2),
      mostIncorrectQuestion: mostIncorrectQuestion
        ? mostIncorrectQuestion.text
        : "No mistakes found",
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz analytics",
      error: error.message,
    });
  }
};
