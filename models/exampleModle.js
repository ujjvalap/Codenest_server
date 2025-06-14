import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Example Schema
const exampleSchema = new Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String },
});

const Example = mongoose.model("Example", exampleSchema);

export default Example;
