import Question from "../models/questionModel.js";
import Example from "../models/exampleModle.js";

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private (admin only)
export const createQuestion = async (req, res) => {
  try {
    const {
      title,
      problemStatement,
      inputFormat,
      outputFormat,
      constraints,
      maxScore,
      difficulty,
      tags,
      hints,
      timeLimit,
      memoryLimit,
      difficultyScore,
      languagesAllowed,
      estimatedSolveTime,
      boilerplateCode,
      examples,
    } = req.body;

    // Create new examples if provided
    let exampleIds = [];
    if (examples && examples.length > 0) {
      for (const example of examples) {
        const newExample = new Example(example);
        await newExample.save();
        exampleIds.push(newExample._id);
      }
    }

    // Create the question
    const newQuestion = new Question({
      title,
      problemStatement,
      inputFormat,
      outputFormat,
      constraints,
      maxScore,
      difficulty: difficulty || "Easy",
      tags,
      author: req.admin._id,
      hints,
      timeLimit,
      memoryLimit,
      difficultyScore,
      languagesAllowed,
      estimatedSolveTime,
      boilerplateCode,
      examples: exampleIds,
    });

    await newQuestion.save();

    res.status(200).json({
      success: true,
      message: "Question created successfully",
      newQuestion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create question",
      error: error.message,
    });
  }
};

// @desc    Get all questions
// @route   GET /api/questions
// @access  Public
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate("examples testCases")
      .exec();

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
};
// @desc    Get a single question by ID
// @route   GET /api/questions/:id
// @access  Public
export const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("examples testCases")
      .exec();
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Question retrieved successfully",
      question,
    });
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question",
      error: error.message,
    });
  }
};

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private (admin only)
export const updateQuestion = async (req, res) => {
  try {
    const updatedData = req.body;

    // Handle examples separately if provided
    if (updatedData.examples && updatedData.examples.length > 0) {
      let exampleIds = [];

      // Loop through each example in the updated examples
      for (const example of updatedData.examples) {
        // If the example already exists, update it
        if (example._id) {
          const existingExample = await Example.findById(example._id);
          if (existingExample) {
            // Update the existing example
            existingExample.set(example);
            await existingExample.save();
            exampleIds.push(existingExample._id);
          }
        } else {
          // If the example is new (no _id), create it
          const newExample = new Example(example);
          await newExample.save();
          exampleIds.push(newExample._id);
        }
      }

      // Update the examples field with the new list of exampleIds
      updatedData.examples = exampleIds;
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).exec();

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      question,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message,
    });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private (admin only)
export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id).exec();
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: error.message,
    });
  }
};
