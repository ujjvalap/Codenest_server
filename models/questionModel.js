import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Question Schema
const questionSchema = new Schema({
  title: { type: String, required: true },
  problemStatement: { type: String, required: true },
  inputFormat: { type: String, required: true },
  outputFormat: { type: String, required: true },
  constraints: [{ type: String }],
  maxScore: { type: String, required: true },
  difficulty: {
    type: String,
    // enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },

  // Additional fields
  tags: [{ type: String }],
  author: { type: Schema.Types.ObjectId, ref: "Admin" },
  hints: [{ type: String }],
  timeLimit: { type: String, default: 1 }, // in seconds
  memoryLimit: { type: String, default: 256 }, // in MB
  difficultyScore: { type: Number }, //, min: 1, max: 10
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  sampleSolution: { type: String },
  isActive: { type: Boolean, default: true },
  languagesAllowed: [
    { type: String }, //enum: ["cpp", "python", "javascript", "java"]
  ],
  estimatedSolveTime: { type: String }, // in minutes
  boilerplateCode: {
    cpp: { type: String },
    python: { type: String },
    javascript: { type: String },
    java: { type: String },
  },

  testCases: [{ type: Schema.Types.ObjectId, ref: "TestCase" }],

  // Reference to Example model
  examples: [{ type: Schema.Types.ObjectId, ref: "Example" }],
});

const Question = mongoose.model("Question", questionSchema);

export default Question;
