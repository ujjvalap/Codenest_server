import crypto from "crypto";
import mongoose from "mongoose";
import Admin from "../models/adminModel.js";
import Challenge from "../models/challengeModel.js";
import ChallengeProgress from "../models/challengeProgressModel.js";
import Leaderboard from "../models/leaderboardModel.js";
import Question from "../models/questionModel.js";
import User from "../models/userModel.js";

// Helper function to generate challenge key
const generateChallengeKey = () => crypto.randomBytes(4).toString("hex");

// @desc    Create a new challenge
// @route   POST /api/challenge/create
// @access  Private (Admin only)
export const createChallenge = async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;
    const admin_id = req.admin._id;

    // Step 1: Create the Challenge
    const challenge = new Challenge({
      title,
      description,
      startTime,
      endTime,
      participants: [],
      key: generateChallengeKey(),
      createdBy: admin_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdChallenge = await challenge.save();

    // Step 2: Create the Empty Leaderboard
    const leaderboard = new Leaderboard({
      challenge: createdChallenge._id,
      participants: [], // Empty initially
    });

    await leaderboard.save();

    // Step 3: Link Challenge to Admin
    await Admin.findByIdAndUpdate(admin_id, {
      $push: { challengesCreated: createdChallenge._id },
    });

    res.status(201).json({
      success: true,
      message: "New Challenge  successfully",
      challenge: createdChallenge,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create challenge",
      error: error.message,
    });
  }
};

// @desc    Join a challenge using a key
// @route   POST /api/challenge/join
// @access  Private
export const joinChallengeWithKey = async (req, res) => {
  let { challengeKey } = req.body;
  const userId = req.user._id;

  // Remove whitespace from the challenge key
  challengeKey = challengeKey.trim();

  try {
    const challenge = await Challenge.findOne({ key: challengeKey });
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid challenge key" });
    }

    // Check if the user already has a progress record for this challenge
    const existingProgress = await ChallengeProgress.findOne({
      user: userId,
      challenge: challenge._id,
    });

    // If the user has ended this challenge, prevent joining
    if (existingProgress && existingProgress.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "You cannot join this challenge as it has ended for you",
      });
    }

    // Avoid duplicating the user in the participants list
    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      await challenge.save();
    }

    // Add challenge to the user's participation list
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.challengesParticipated.includes(challenge._id)) {
      user.challengesParticipated.push(challenge._id);
      await user.save();
    }

    // If no progress exists, initialize a new ChallengeProgress record
    if (!existingProgress) {
      const progress = new ChallengeProgress({
        user: userId,
        challenge: challenge._id,
        solvedQuestions: [],
        status: "inProgress",
        startTime: new Date(),
      });

      await progress.save();
    }

    res.json({
      success: true,
      message: "Successfully joined the challenge",
      challengeID: challenge._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to join challenge",
      error: error.message,
    });
  }
};

// @desc    End a contest and calculate time taken
// @route   POST /api/contest/end
// @access  Private
export const endContest = async (req, res) => {
  const { challengeId } = req.body;
  const userId = req.user._id; // assuming `userId` comes from a protected route (middleware)

  try {
    // Find the challenge progress for the user
    const progress = await ChallengeProgress.findOne({
      user: userId,
      challenge: challengeId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Challenge progress not found for this user.",
      });
    }

    // Record the end time and calculate the time taken
    const endTime = new Date();
    const timeTaken = (endTime - progress.startTime) / 1000; // Convert from ms to seconds

    // Update the challenge progress status to "ended"
    progress.status = "ended";
    progress.endTime = endTime;
    progress.timeTaken = timeTaken;

    // Save the updated progress
    await progress.save();

    // Return the updated progress in the response
    res.json({
      success: true,
      message: "Contest ended successfully",
      progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error ending contest",
      error: error.message,
    });
  }
};

export const calculateLeaderboard = async (req, res) => {
  const { id: challengeId } = req.params;

  try {
    // Fetch all ChallengeProgress for the given challenge
    const progressData = await ChallengeProgress.find({
      challenge: challengeId,
    })
      .populate("user", "username email") // Populate user details
      .exec();

    if (!progressData.length) {
      return res.status(404).json({
        success: false,
        message: "No participants found for this challenge.",
      });
    }

    // Calculate scores for each participant
    const leaderboardData = progressData.map((progress) => {
      const baseScore = progress.score || 0;
      const penalties = (progress.penalties || 0) * 10;
      const hints = (progress.hintsUsed || 0) * 5;
      const finalScore = baseScore - penalties - hints;

      return {
        user: progress.user,
        totalScore: finalScore,
        timeTaken: progress.timeTaken || Number.MAX_SAFE_INTEGER,
      };
    });

    // Sort participants by score and timeTaken
    leaderboardData.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore; // Higher score first
      }
      return a.timeTaken - b.timeTaken; // Shorter time first
    });

    // Update the Leaderboard model
    const leaderboard = await Leaderboard.findOneAndUpdate(
      { challenge: challengeId },
      {
        challenge: challengeId,
        participants: leaderboardData.map((data) => ({
          user: data.user,
          totalScore: data.totalScore,
          timeTaken: data.timeTaken,
        })),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    )
      .populate("participants.user", "username email")
      .populate("challenge", "title")
      .exec();

    res.json({
      success: true,
      message: "Leaderboard updated successfully.",
      leaderboard,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error calculating leaderboard",
      error: error.message,
    });
  }
};

// @desc    Get leaderboard for a specific challenge
// @route   GET /api/challenge/leaderboard/:id
// @access  Public or Protected
export const getLeaderboard = async (req, res) => {
  const { id: challengeId } = req.params;

  try {
    const leaderboard = await Leaderboard.findOne({ challenge: challengeId })
      .populate("participants.user", "username email") // Populate user details
      .populate("challenge", "title description")
      .exec();

    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        message: "Leaderboard not found.",
      });
    }

    res.json({
      success: true,
      message: "Leaderboard featch successfully.",
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve leaderboard",
      error: error.message,
    });
  }
};

export const getChallengeProgress = async (req, res) => {
  const { challengeID } = req.params;
  const userId = req.user._id;

  try {
    const progress = await ChallengeProgress.findOne({
      user: userId,
      challenge: challengeID,
    })
      .populate("solvedQuestions")
      .populate("challenge", "title");

    if (!progress) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge progress not found" });
    }

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve progress",
      error: error.message,
    });
  }
};

// @desc    Add a question to a specific challenge
// @route   PUT /api/challenge/:id/add-question
// @access  Private (Admin only)
export const addQuestionToChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionID } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(questionID)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Challenge or Question ID" });
    }

    const challenge = await Challenge.findById(id);
    const question = await Question.findById(questionID);

    if (!challenge || !question) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge or Question not found" });
    }

    if (challenge.questions.includes(questionID)) {
      return res.status(400).json({
        success: false,
        message: "Question already added to this challenge",
      });
    }

    challenge.questions.push(questionID);
    challenge.updatedAt = new Date();
    await challenge.save();

    res.status(200).json({
      success: true,
      message: "Question added successfully",
      challenge,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add question",
      error: error.message,
    });
  }
};

// @desc    Remove a question from a challenge
// @route   DELETE /api/challenge/:id/remove-question
// @access  Private (Admin only)
export const removeQuestionFromChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionID } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(questionID)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Challenge or Question ID" });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
    }

    const questionIndex = challenge.questions.indexOf(questionID);
    if (questionIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Question not found in this challenge",
      });
    }

    challenge.questions.splice(questionIndex, 1);
    challenge.updatedAt = new Date();
    await challenge.save();

    res.status(200).json({
      success: true,
      message: "Question removed successfully",
      challenge,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove question",
      error: error.message,
    });
  }
};

// @desc    Get all challenges
// @route   GET /api/challenges/all
// @access  Private
export const getAllChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find().populate(
      "questions participants"
    );
    res.status(200).json({ success: true, challenges });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve challenges",
      error: error.message,
    });
  }
};

// @desc    Get a specific challenge by ID
// @route   GET /api/challenges/:id
// @access  Private
export const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Challenge ID" });
    }

    const challenge = await Challenge.findById(id)
      .populate({
        path: "questions",
        populate: [
          {
            path: "testCases",
          },
          {
            path: "examples",
          },
        ],
      })
      .populate("participants");
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
    }

    res.status(200).json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve challenge",
      error: error.message,
    });
  }
};

// @desc    Update a challenge
// @route   PUT /api/challenges/:id/update
// @access  Private (Admin only)
export const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Challenge ID" });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
    }

    challenge.title = title || challenge.title;
    challenge.description = description || challenge.description;
    challenge.startTime = startTime || challenge.startTime;
    challenge.endTime = endTime || challenge.endTime;
    challenge.updatedAt = new Date();

    const updatedChallenge = await challenge.save();

    res.status(200).json({
      success: true,
      message: "Challenge updated successfully",
      challenge: updatedChallenge,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update challenge",
      error: error.message,
    });
  }
};

// @desc    Delete a challenge
// @route   DELETE /api/challenges/:id/delete
// @access  Private (Admin only)
export const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Challenge ID" });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
    }

    await challenge.remove();
    res
      .status(200)
      .json({ success: true, message: "Challenge deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete challenge",
      error: error.message,
    });
  }
};
