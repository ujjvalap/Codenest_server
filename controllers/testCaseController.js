import TestCase from "../models/testCaseModel.js";
import Question from "../models/questionModel.js";

// @desc    Create a new test case for a specific question
// @route   POST /api/questions/:id/testcases
// @access  Private
export const createTestCase = async (req, res) => {
  try {
    const { input, output, isHidden, type } = req.body; // Added 'type' field
    const { id: questionId } = req.params;

    // Check if the question exists
    const questionExists = await Question.findById(questionId);

    if (!questionExists) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Create and save the new test case
    const testCase = new TestCase({
      input,
      output,
      isHidden,
      type, // Added 'type' when creating a new test case
      question: questionExists._id,
    });

    const savedTestCase = await testCase.save();

    // Add the created test case ID to the question's testCases array
    questionExists.testCases.push(savedTestCase._id);
    await questionExists.save();

    res.status(200).json({
      success: true,
      message: "Test case created successfully",
      testCase: savedTestCase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while creating test case",
      error: error.message,
    });
  }
};

// @desc    Get all test cases for a specific question
// @route   GET /api/questions/:id/testcases
// @access  Public
export const getTestCasesForQuestion = async (req, res) => {
  try {
    const { id: questionId } = req.params;

    // Fetch all test cases associated with the given question ID
    const testCases = await TestCase.find({ question: questionId });

    // Separate the public and private test cases based on the isHidden field
    const publicTestCases = testCases.filter((testCase) => !testCase.isHidden);
    const privateTestCases = testCases.filter((testCase) => testCase.isHidden);

    res.status(200).json({
      success: true,
      message: "Test cases fetched successfully",
      testCases,
      publicTestCases, // Public test cases
      privateTestCases, // Private test cases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching test cases for the question",
      error: error.message,
    });
  }
};

// @desc    Update a test case by ID
// @route   PUT /api/testcases/:id
// @access  Private
export const updateTestCase = async (req, res) => {
  try {
    const { id: testCaseId } = req.params;
    const { input, output, isHidden, type } = req.body; // Added 'type' field

    console.log(req.body);

    // Find the test case by ID
    const testCase = await TestCase.findById(testCaseId);
    if (!testCase) {
      return res.status(404).json({
        success: false,
        message: "Test case not found",
      });
    }

    // Update the test case with new data if provided
    testCase.input = input || testCase.input;
    testCase.output = output || testCase.output;
    testCase.isHidden = isHidden !== undefined ? isHidden : testCase.isHidden;
    testCase.type = type || testCase.type; // Update 'type' if provided

    await testCase.save();

    res.status(200).json({
      success: true,
      message: "Test case updated successfully",
      testCase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating test case",
      error: error.message,
    });
  }
};

// @desc    Delete a test case by ID
// @route   DELETE /api/testcases/:id
// @access  Private
export const deleteTestCase = async (req, res) => {
  try {
    const { id: testCaseId } = req.params;

    // Find and delete the test case
    const testCase = await TestCase.findByIdAndDelete(testCaseId);
    if (!testCase) {
      return res.status(404).json({
        success: false,
        message: "Test case not found",
      });
    }

    // Remove the test case ID from the associated question's testCases array
    await Question.findByIdAndUpdate(
      testCase.question,
      { $pull: { testCases: testCaseId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Test case deleted successfully",
      testCase: null, // As the test case is deleted, sending null here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting test case",
      error: error.message,
    });
  }
};
