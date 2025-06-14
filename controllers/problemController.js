// controllers/potdController.js
import POTD from "../models/potd.js"; // Your POTD model
import Question from "../models/Question.js"; // Question model to populate

export const getProblemOfTheDay = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (midnight)

    // Find the POTD entry for today
    const potd = await POTD.findOne({ date: today }).populate('question');

    if (!potd) {
      return res.status(404).json({ success: false, message: "Problem not found for today." });
    }

    // Respond with the problem details
    res.status(200).json({ success: true, problem: potd.question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
