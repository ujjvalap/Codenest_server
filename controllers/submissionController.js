import { executeCode } from "../constants/executeApi.js";
import ChallengeProgress from "../models/challengeProgressModel.js";
import Question from "../models/questionModel.js";
import Submission from "../models/submissionModel.js";
import TestCase from "../models/testCaseModel.js";

// @desc    Create a new submission
// @route   POST /api/submissions
// @access  Private
// Submit a solution
// Execute code against private test cases
export const submitSolution = async (req, res) => {
  try {
    const { challenge, question, code, language } = req.body;
    const user = req.user._id;

    if (!challenge || !question || !code || !language) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingSubmission = await Submission.findOne({
      user,
      challenge,
      question,
      status: "pass",
    });

    const questionData = await Question.findById({ _id: question });
    const testCases = await TestCase.find({ question });

    if (!testCases.length) {
      return res.status(404).json({
        success: false,
        message: "No test cases found for this question",
      });
    }

    const {
      totalTestCases,
      passedTestCases,
      errorDetails,
      results: testCaseResults,
    } = await executeCode({
      code,
      language,
      testCases,
    });

    const allPassed = passedTestCases === totalTestCases;
    const status = allPassed ? "pass" : "fail";

    const submission = await Submission.create({
      user,
      challenge,
      question,
      code,
      language,
      status,
      score: existingSubmission
        ? "Already earned"
        : allPassed
        ? questionData.maxScore
        : 0,
    });

    if (allPassed && !existingSubmission) {
      await ChallengeProgress.findOneAndUpdate(
        { user, challenge },
        {
          $addToSet: { solvedQuestions: question },
          $set: { lastUpdated: new Date() },
          $inc: { score: questionData.maxScore },
        },
        { upsert: true, new: true }
      );
    }

    const message = allPassed
      ? "All test cases passed."
      : `Some test cases failed. Passed ${passedTestCases} out of ${totalTestCases}.`;

    res.status(200).json({
      success: true,
      message,
      status,
      totalTestCases,
      passedTestCases,
      errorDetails,
      testCaseResults,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error submitting solution",
      error: error.message,
    });
  }
};

// @desc    Get submissions for a specific challenge and question by a user
// @route   GET /api/submissions/challenge/:challengeId/question/:questionId/user/:userId
// @access  Private
export const getChallengeQuestionSubmissionsByUser = async (req, res) => {
  try {
    const { challengeId, questionId } = req.params;
    const userId = req.user._id;

    // Fetch submissions matching the challenge, question, and user
    const submissions = await Submission.find({
      challenge: challengeId,
      question: questionId,
      user: userId,
    })
      .populate("challenge", "title")
      .populate("question", "title")
      .populate("user", "username")
      .sort({ submittedAt: -1 }); // Sorting by latest submission

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message:
          "No submissions yet for this challenge or question. Stay tuned!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Submissions fetched successfully",
      submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching submissions for user, challenge, and question",
      error: error.message,
    });
  }
};

// @desc    Get submissions by user
// @route   GET /api/submissions/user/:userId
// @access  Private
export const getUserSubmissions = async (req, res) => {
  try {
    const userId = req.user._id;
    const submissions = await Submission.find({ user: userId })
      .populate("challenge", "title")
      .populate("question", "title")
      .populate("user", "username");

    res.status(200).json({
      success: true,
      message: "User submissions fetched successfully",
      submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user submissions",
      error: error.message,
    });
  }
};

// @desc    Delete a submission
// @route   DELETE /api/submissions/:id
// @access  Private (Admin only)
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    await submission.remove();
    res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting submission",
      error: error.message,
    });
  }
};
