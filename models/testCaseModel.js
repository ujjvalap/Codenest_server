import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Define the TestCase Schema
const testCaseSchema = new Schema({
  input: {
    type: String,
    required: true,
    trim: true,
  },
  output: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["Single-line", "Multi-line", "Edge Case"],
    required: true,
    default: "Single-line",
    description:
      "The type of test case (Single-line, Multi-line, or Edge Case)",
  },
  isHidden: {
    type: Boolean,
    default: false,
    description: "Hidden test cases are used to prevent hardcoding solutions.",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  question: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
});

// Method to toggle hidden status
testCaseSchema.methods.toggleHidden = function () {
  this.isHidden = !this.isHidden;
  return this.save();
};

// Pre-save middleware to trim input and output
testCaseSchema.pre("save", function (next) {
  this.input = this.input.trim();
  this.output = this.output.trim();
  next();
});

// Create the TestCase model
const TestCase = mongoose.model("TestCase", testCaseSchema);

export default TestCase;
