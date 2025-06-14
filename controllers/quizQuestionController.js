import Quiz from "../models/quizModel.js";
import QuizQuestion from "../models/quizQuestionModel.js";

// Create a new question
export const createQuestion = async (req, res) => {
  try {
    const {
      text,
      options,
      correctAnswerIndex,
      marks,
      difficulty,
      explanation,
      quizId,
      tags,
    } = req.body;

    // Validate quiz existence
    const quiz = await Quiz.findById(quizId);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    // Validate options for MCQ
    if (!options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "MCQ must have at least two options",
      });
    }

    // Validate correctAnswerIndex
    if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid correctAnswerIndex" });
    }

    const newQuestion = new QuizQuestion({
      text,
      options,
      correctAnswerIndex,
      marks,
      difficulty,
      explanation,
      createdBy: req.admin._id,
      tags,
    });

    await newQuestion.save();

    // Add the new question to the quiz
    quiz.questions.push(newQuestion._id);

    // Update total marks
    quiz.totalMarks = (quiz.totalMarks || 0) + marks;

    await quiz.save();

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error); // Log the actual error
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Create multiple quiz questions
export const createMultipleQuestions = async (req, res) => {
  try {
    const { questions, quizId } = req.body;

    // Validate quiz existence
    const quiz = await Quiz.findById(quizId);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    if (!Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No questions provided" });
    }

    let totalMarksAdded = 0;

    for (const question of questions) {
      const { text, options, correctAnswerIndex, marks, explanation } =
        question;

      // Validate options for MCQ
      if (!options || options.length < 2) {
        return res
          .status(400)
          .json({
            success: false,
            message: "MCQ must have at least two options",
          });
      }

      // Validate correctAnswerIndex
      if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid correctAnswerIndex" });
      }

      const newQuestion = new QuizQuestion({
        text,
        options,
        correctAnswerIndex,
        marks,
        difficulty: "easy",
        explanation,
        createdBy: req.admin._id,
        tags: [],
      });

      await newQuestion.save();
      quiz.questions.push(newQuestion._id);
      totalMarksAdded += marks;
    }

    // Update total marks
    quiz.totalMarks = (quiz.totalMarks || 0) + totalMarksAdded;
    await quiz.save();

    res.status(201).json({
      success: true,
      message: "Questions created successfully",
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all questions
export const getQuestions = async (req, res) => {
  try {
    const questions = await QuizQuestion.find()
      .populate("createdBy", "name")
      .populate("quizId", "name");

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: questions,
    });
  } catch (error) {
    console.error("Error creating question:", error); // Log the actual error
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get a single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.id).populate(
      "createdBy",
      "name"
    );

    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    res.status(200).json({
      success: true,
      message: "Question retrieved successfully",
      data: question,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Update a question
export const updateQuestion = async (req, res) => {
  try {
    const {
      text,
      options,
      correctAnswerIndex,
      marks,
      difficulty,
      explanation,
      tags,
    } = req.body;

    // Find the existing question
    const existingQuestion = await QuizQuestion.findById(req.params.id);
    if (!existingQuestion)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    // Find the associated quiz
    const quiz = await Quiz.findOne({ questions: req.params.id });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found for this question" });

    // Calculate the marks difference
    const marksDifference = marks ? marks - existingQuestion.marks : 0;

    // Update the question
    const updatedQuestion = await QuizQuestion.findByIdAndUpdate(
      req.params.id,
      {
        text,
        options,
        correctAnswerIndex,
        marks,
        difficulty,
        explanation,
        tags,
      },
      { new: true }
    );

    // Update total marks
    quiz.totalMarks = (quiz.totalMarks || 0) + marksDifference;
    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Delete a question
export const deleteQuestion = async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.id);
    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    // Find the associated quiz
    const quiz = await Quiz.findOne({ questions: req.params.id });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found for this question" });

    // Remove question from quiz
    quiz.questions = quiz.questions.filter(
      (qId) => qId.toString() !== req.params.id
    );

    // Deduct marks from total
    quiz.totalMarks = (quiz.totalMarks || 0) - question.marks;
    if (quiz.totalMarks < 0) quiz.totalMarks = 0; // Ensure it doesn't go negative

    await quiz.save();
    await QuizQuestion.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};
