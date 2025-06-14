import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: "QuizQuestion" },
        selectedOption: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
        timeTaken: { type: Number, required: true }, // Time taken for this question (in seconds)
      },
    ],
    totalScore: { type: Number, default: 0 },
    totalTimeTaken: { type: Number, default: 0 }, // ✅ Set default value
  },
  { timestamps: true }
);

const Submission = mongoose.model("QuizSubmission", submissionSchema);
export default Submission;
