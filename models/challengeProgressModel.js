import mongoose from "mongoose";

const { Schema } = mongoose;

const challengeProgressSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
  },
  solvedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  lastUpdated: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["inProgress", "completed", "ended"],
    default: "inProgress",
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  score: { type: Number, default: 0 },
  timeTaken: { type: Number, default: 0 }, // Time in seconds or milliseconds
  penalties: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
});

const ChallengeProgress = mongoose.model(
  "ChallengeProgress",
  challengeProgressSchema
);
export default ChallengeProgress;
