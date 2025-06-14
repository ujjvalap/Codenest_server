import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: { type: String },
    options: [{ type: String, required: true }],
    correctAnswerIndex: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return this.options && value >= 0 && value < this.options.length;
        },
        message: "correctAnswerIndex must refer to a valid option.",
      },
    },
    marks: { type: Number, required: true, default: 1 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    explanation: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const Question = mongoose.model("QuizQuestion", QuestionSchema);
export default Question;
