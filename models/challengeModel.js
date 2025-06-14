import mongoose from "mongoose";

const Schema = mongoose.Schema;

const challengeSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  key: { type: String }, // Unique key for joining the challenge
  createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;
