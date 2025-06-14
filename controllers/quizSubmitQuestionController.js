import Quiz from "../models/quizModel.js";
import Question from "../models/quizQuestionModel.js";
import Submission from "../models/quizSubmissionModel.js";

// Initialize a quiz submission when a user attempts a quiz.
export const initializeSubmission = async (req, res) => {
  try {
    const { quizId } = req.body;

    const userId = req.user._id;

    // Check if the user already attempted this quiz
    const existingSubmission = await Submission.findOne({
      user: userId,
      quiz: quizId,
    });

    if (existingSubmission) {
      return res
        .status(400)
        .json({ message: "You have already attempted this quiz." });
    }

    // Create a new submission entry
    const newSubmission = new Submission({
      user: userId,
      quiz: quizId,
      answers: [],
      totalScore: 0,
      totalTimeTaken: 0,
    });

    await newSubmission.save();
    return res
      .status(201)
      .json({ success: true, message: "Quiz attempt initialized." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Submit or update one question at a time
export const submitQuestion = async (req, res) => {
  try {
    const { quizId, questionId, selectedOption, timeTaken } = req.body;
    const userId = req.user._id;

    // Validate quiz existence
    const quiz = await Quiz.findById(quizId);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    // Validate question existence
    const question = await Question.findById(questionId);
    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    // Check if the selected option is correct
    const isCorrect =
      selectedOption !== null
        ? question.correctAnswerIndex === selectedOption
        : false;
    const questionScore = isCorrect ? question.marks : 0;

    // Find or create user submission
    let userSubmission = await Submission.findOne({
      user: userId,
      quiz: quizId,
    });

    if (!userSubmission) {
      userSubmission = new Submission({
        user: userId,
        quiz: quizId,
        answers: [],
        totalScore: 0, // ✅ Fix: Use totalScore instead of score
        totalTimeTaken: 0,
      });
    }

    // Check if question was already submitted
    const existingAnswerIndex = userSubmission.answers.findIndex(
      (answer) => answer.question.toString() === questionId
    );

    if (existingAnswerIndex !== -1) {
      const previousAnswer = userSubmission.answers[existingAnswerIndex];

      // Adjust score based on new answer
      if (previousAnswer.isCorrect && !isCorrect) {
        userSubmission.totalScore -= question.marks; // ✅ Fix: Use totalScore
      } else if (!previousAnswer.isCorrect && isCorrect) {
        userSubmission.totalScore += question.marks; // ✅ Fix: Use totalScore
      }

      // Adjust total time
      userSubmission.totalTimeTaken -= previousAnswer.timeTaken;
      userSubmission.totalTimeTaken += timeTaken;

      // Update the previous answer
      userSubmission.answers[existingAnswerIndex] = {
        question: question._id,
        selectedOption,
        isCorrect,
        timeTaken,
      };
    } else {
      // If new submission, save answer
      userSubmission.answers.push({
        question: question._id,
        selectedOption,
        isCorrect,
        timeTaken,
      });

      // Update total score & total time
      userSubmission.totalScore += questionScore; // ✅ Fix: Use totalScore
      userSubmission.totalTimeTaken += timeTaken;
    }

    await userSubmission.save();

    res.status(201).json({
      success: true,
      message: "Question submitted successfully",
      isCorrect,
      totalScore: userSubmission.totalScore, // ✅ Fix: Use totalScore
      totalTimeTaken: userSubmission.totalTimeTaken,
      submittedQuestion: {
        questionId,
        selectedOption,
        isCorrect,
        timeTaken,
      },
    });
  } catch (error) {
    console.error("Submission Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Submit or update a questions
export const submitQuestions = async (req, res) => {
  try {
    const { quizId, submissions } = req.body;
    const userId = req.user._id;

    // Validate quiz existence
    const quiz = await Quiz.findById(quizId);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    // Find or create user submission
    let userSubmission = await Submission.findOne({ user: userId, quiz: quizId });
    if (!userSubmission) {
      userSubmission = new Submission({
        user: userId,
        quiz: quizId,
        answers: [],
        totalScore: 0,
        totalTimeTaken: 0,
      });
    }

    for (const { questionId, selectedOption, timeTaken } of submissions) {
      const question = await Question.findById(questionId);
      if (!question) continue; // Skip if question doesn't exist

      const isCorrect = selectedOption !== null
        ? question.correctAnswerIndex === selectedOption
        : false;

      const questionScore = isCorrect ? question.marks : 0;

      // Check if question was already submitted
      const existingAnswerIndex = userSubmission.answers.findIndex(
        (answer) => answer.question.toString() === questionId
      );

      if (existingAnswerIndex !== -1) {
        const previousAnswer = userSubmission.answers[existingAnswerIndex];

        // Adjust score
        if (previousAnswer.isCorrect && !isCorrect) {
          userSubmission.totalScore -= question.marks;
        } else if (!previousAnswer.isCorrect && isCorrect) {
          userSubmission.totalScore += question.marks;
        }

        // Adjust time
        userSubmission.totalTimeTaken -= previousAnswer.timeTaken;
        userSubmission.totalTimeTaken += timeTaken;

        // Update the answer
        userSubmission.answers[existingAnswerIndex] = {
          question: question._id,
          selectedOption,
          isCorrect,
          timeTaken,
        };
      } else {
        // New answer
        userSubmission.answers.push({
          question: question._id,
          selectedOption,
          isCorrect,
          timeTaken,
        });

        userSubmission.totalScore += questionScore;
        userSubmission.totalTimeTaken += timeTaken;
      }
    }

    await userSubmission.save();

    res.status(201).json({
      success: true,
      message: "Questions submitted successfully",
      totalScore: userSubmission.totalScore,
      totalTimeTaken: userSubmission.totalTimeTaken,
      answers: userSubmission.answers,
    });
  } catch (error) {
    console.error("Submission Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};


// Get user quiz submissions
export const getUserQuizSubmission = async (req, res) => {
  try {
    const { userId, quizId } = req.params;

    const submission = await Submission.findOne({ user: userId, quiz: quizId })
      .populate("quiz", "name questions")
      .populate("answers.question", "text options correctAnswerIndex");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this user in the given quiz.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User quiz submission fetched successfully",
      submission,
    });
  } catch (error) {
    console.error("Error fetching quiz submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user quiz submissions",
      error: error.message,
    });
  }
};
