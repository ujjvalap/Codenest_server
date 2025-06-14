import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Admin/Teacher who created it
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number }, // Duration in minutes
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "QuizQuestion" }],
    maxAttempts: { type: Number, default: 1 }, // Number of attempts allowed
    totalMarks: { type: Number, default: 0 }, // Total marks for the quiz
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    }, // Status of quiz
  },
  { timestamps: true }
);

// Middleware to auto-update status based on time
QuizSchema.pre("save", function (next) {
  const now = new Date();
  if (now < this.startTime) {
    this.status = "upcoming";
  } else if (now >= this.startTime && now <= this.endTime) {
    this.status = "ongoing";
  } else {
    this.status = "completed";
  }
  next();
});

const Quiz = mongoose.model("Quiz", QuizSchema);
export default Quiz;
