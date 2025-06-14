import mongoose from "mongoose";

const Schema = mongoose.Schema;

const submissionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
  question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: {
    type: String,
    enum: ["pass", "fail", "pending"],
    default: "pending",
  },
  score: { type: String, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
