import mongoose from "mongoose";

const Schema = mongoose.Schema;

// POTD Schema
const potdSchema = new Schema({
  date: { type: Date, required: true, unique: true },
  question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
});

const POTD = mongoose.model("POTD", potdSchema);

export default POTD;
