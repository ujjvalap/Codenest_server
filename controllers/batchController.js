import Admin from "../models/adminModel.js";
import Batch from "../models/batchModel.js";
import Submission from "../models/quizSubmissionModel.js";
import User from "../models/userModel.js";

// @desc   Create a new batch
// @route  POST /api/batches
// @access Admin
export const createBatch = async (req, res) => {
  try {
    const { name, description } = req.body;

    console.log(req.body);

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        err: req.body,
      });
    }

    const newBatch = await Batch.create({
      name,
      description,
      createdBy: req.admin._id,
      startDate: Date.now(),
    });

    await Admin.findByIdAndUpdate(req.admin._id, {
      $push: { batches: newBatch._id },
    });

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      batch: newBatch,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc   Request to join a batch using batch code
// @route  POST /api/batches/join
// @access Student
export const requestJoinBatch = async (req, res) => {
  try {
    const batchCode = req.body.batchCode?.trim();
    const studentId = req.user._id;

    console.log(batchCode);

    if (!batchCode) {
      return res
        .status(400)
        .json({ success: false, message: "Batch code is required" });
    }

    const batch = await Batch.findOne({ batchCode });
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid batch code" });
    }

    if (batch.students.includes(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Already joined this batch" });
    }

    if (batch.pendingRequests.includes(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Join request already sent" });
    }

    // Add student to batch's pending requests
    batch.pendingRequests.push(studentId);

    // Update user's pendingRequests to track request
    const user = await User.findById(studentId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.pendingRequests.some((id) => id.equals(batch._id))) {
      user.pendingRequests.push(batch._id);
    }

    // Save both models
    await Promise.all([batch.save(), user.save()]);

    // Populate pending requests after saving
    const updatedUser = await User.findById(studentId).populate(
      "pendingRequests",
      "name"
    );

    res.status(200).json({
      success: true,
      message: "Join request sent successfully.",
      pendingRequests: updatedUser.pendingRequests,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc   Approve or reject a student's join request
// @route  POST /api/batches/:batchId/manageRequest
// @access Admin
export const manageJoinRequest = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { studentId, action } = req.body; // action = "approve" or "reject"

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    if (!batch.pendingRequests.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "No pending request from this student",
      });
    }

    // Approve request
    if (action === "approve") {
      batch.students.push(studentId);
    }

    // Remove student from pending requests in batch
    batch.pendingRequests = batch.pendingRequests.filter(
      (id) => id.toString() !== studentId
    );

    // Update user: Remove from pendingRequests and add to batches if approved
    await User.findByIdAndUpdate(studentId, {
      $pull: { pendingRequests: batch._id }, // Remove batch from user's pendingRequests
      ...(action === "approve" && { $push: { batches: batch._id } }), // Add batch to user's enrolled batches if approved
    });

    await batch.save();

    res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "Student added to batch"
          : "Join request rejected",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc   Get all batches (for admins)
// @route  GET /api/batches
// @access Admin
export const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate("createdBy", "name email")
      .populate("students", "name email");
    res.status(200).json({ success: true, batches });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export const getStudentQuizPerformance = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Check if the batch exists
    const batch = await Batch.findById(batchId).populate("quizzes students");
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Check if the batch has students
    if (batch.students.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No students in this batch" });
    }

    // Check if the batch has quizzes
    if (batch.quizzes.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No quizzes found in this batch" });
    }

    // Fetch all submissions for the quizzes in this batch
    const submissions = await Submission.find({
      quiz: { $in: batch.quizzes },
      user: { $in: batch.students }, // Ensure only batch students' data is fetched
    })
      .populate("user quiz")
      .sort({ createdAt: -1 }); // Sort by latest submission date

    if (!submissions.length) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No quiz submissions found for this batch",
        });
    }

    // Format the response
    const performanceData = submissions.map((submission) => ({
      student: submission.user.username, // Assuming User model has a "name" field
      quiz: submission.quiz.name, // Assuming Quiz model has a "title" field
      score: submission.totalScore,
      total: submission.quiz.totalMarks, // Assuming total questions = length of answers array
      date: submission.createdAt.toISOString().split("T")[0], // Format as YYYY-MM-DD
    }));

    res.status(200).json({ success: true, performanceData });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc   Get a batch by ID
// @route  GET /api/batches/:id
// @access Admin & User
export const getBatchById = async (req, res) => {
  try {
    const userId = req.query?.userId; // No default value

    // Fetch batch with related data
    const batch = await Batch.findById(req.params.batchId)
      .populate("createdBy", "username email")
      .populate("students", "username email")
      .populate("quizzes")
      .populate("pendingRequests", "username email");

    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    const now = new Date();

    const quizzesWithUpdatedStatus = await Promise.all(
      batch.quizzes.map(async (quiz) => {
        let newStatus = quiz.status;
        let totalScore = null; // Default: No score

        if (userId && userId !== "undefined") {
          try {
            const userSubmission = await Submission.findOne({
              quiz: quiz._id,
              user: userId,
            });

            if (userSubmission) {
              newStatus = "completed";
              totalScore = userSubmission.totalScore; // Get total score from Submission
            } else if (now < quiz.startTime) {
              newStatus = "upcoming";
            } else if (now > quiz.endTime) {
              newStatus = "completed";
            } else {
              newStatus = "ongoing";
            }
          } catch (err) {
            console.error("Error checking user attempts:", err);
          }
        } else {
          // If no userId, determine status based only on time
          if (now < quiz.startTime) newStatus = "upcoming";
          else if (now > quiz.endTime) newStatus = "completed";
          else newStatus = "ongoing";
        }

        return { ...quiz.toObject(), status: newStatus, totalScore };
      })
    );

    // Sort quizzes by startTime (earliest first)
    quizzesWithUpdatedStatus.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );

    res.status(200).json({
      success: true,
      batch: {
        ...batch.toObject(),
        quizzes: quizzesWithUpdatedStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc   Update batch details
// @route  PUT /api/batches/:batchId
// @access Admin
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    console.log(id, name, description);

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        err: req.body,
      });
    }

    // Find batch by ID
    const batch = await Batch.findById(id);
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Update fields if provided
    if (name) batch.name = name;
    if (description) batch.description = description;

    // Save the updated batch
    await batch.save();

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      batch,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc   Delete a batch
// @route  DELETE /api/batches/:batchId
// @access Admin
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the batch
    const batch = await Batch.findByIdAndDelete(id);
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Remove batch reference from students
    await User.updateMany({ batches: id }, { $pull: { batches: id } });

    // Remove batch reference from admin
    await Admin.updateMany({ batches: id }, { $pull: { batches: id } });

    res
      .status(200)
      .json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
