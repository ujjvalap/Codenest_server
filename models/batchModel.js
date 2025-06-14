import mongoose from "mongoose";
import { nanoid } from "nanoid"; // Generates a unique batch code

const BatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    batchCode: { type: String, unique: true, default: () => nanoid(8) }, // Unique batch code for students
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Admin who created batch
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Approved students
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Pending join requests
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }], // Quizzes in this batch
    startDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" }, // Batch status
  },
  { timestamps: true }
);

const Batch = mongoose.model("Batch", BatchSchema);
export default Batch;
