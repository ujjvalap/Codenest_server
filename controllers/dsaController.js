import { responseBot } from "../utils/chatbot.js";
import Question from "../models/questionModel.js";
import Example from "../models/exampleModle.js";
import TestCase from "../models/testCaseModel.js";
import Challenge from "../models/challengeModel.js";
import Quiz from "../models/quizModel.js";
import QuizQuestion from "../models/quizQuestionModel.js";

// Initial system prompt for bot
let dsaHistory = [
  {
    role: "system",
    content: `
You are a coding assistant that responds ONLY with pure JSON without any Markdown syntax or headings.

Strict Rules:
- ❌ DO NOT add \`\`\`json or any \`\`\`.
- ❌ DO NOT write "Here are the questions" or any text.
- ❌ DO NOT add any whitespace outside json.
- ✅ Only pure JSON array must be output.

DSA Question JSON structure:

[
  {
    "title": "String",
    "problemStatement": "String",
    "inputFormat": "String",
    "outputFormat": "String",
    "constraints": ["String"],
    "maxScore": "String",
    "difficulty": "String",
    "tags": ["String"],
    "hints": ["String"],
    "timeLimit": "String",
    "memoryLimit": "String",
    "difficultyScore": Number,
    "sampleSolution": "String",
    "languagesAllowed": ["String"],
    "estimatedSolveTime": "String",
    "boilerplateCode": {
      "cpp": "String",
      "python": "String",
      "javascript": "String",
      "java": "String"
    },
    "examples": [
      {
        "input": "String",
        "output": "String",
        "explanation": "String"
      }
    ],
    "testCases": [
      {
        "input": "String",
        "output": "String",
        "type": "Single-line" | "Multi-line" | "Edge Case",
        "isHidden": Boolean
      }
    ]
  }
]

Behavior:
- If the user asks for "5 array questions", reply with 5 JSON objects inside a single array.
- Never wrap or explain anything outside the JSON.
`
  }
];

export const handleDSAChat = async (req, res) => {
  try {
    const { message,challengeID } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!challengeID) return res.status(400).json({ error: "User ID not found" });

    dsaHistory.push({ role: "user", content: message });
    const trimmed = [dsaHistory[0], ...dsaHistory.slice(-2)];
    const botReply = await responseBot(trimmed);
    dsaHistory.push({ role: "assistant", content: botReply });

    let questions;
    try {
      questions = JSON.parse(botReply);
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON from bot", botReply });
    }
    

    let savedCount = 0;

    for (const q of questions) {
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
        sampleSolution,
        languagesAllowed,
        estimatedSolveTime,
        boilerplateCode,
        examples,
        testCases,
      } = q;

      // Save examples
      let exampleIds = [];
      if (examples && examples.length > 0) {
        for (const ex of examples) {
          const newEx = new Example(ex);
          await newEx.save();
          exampleIds.push(newEx._id);
        }
      }

      // Save the question
      const newQuestion = new Question({
        title,
        problemStatement,
        inputFormat,
        outputFormat,
        constraints,
        maxScore,
        difficulty: difficulty || "Easy",
        tags,
        author: challengeID,  // 📌 Link the question to the user
        hints,
        timeLimit,
        memoryLimit,
        difficultyScore,
        sampleSolution,
        languagesAllowed,
        estimatedSolveTime,
        boilerplateCode,
        examples: exampleIds,
      });

      await newQuestion.save();

      // ✅ Push this question to user's "personal questions" (assuming you have a 'questions' field in User schema)
      await Challenge.findByIdAndUpdate(
        challengeID,
        { $push: { questions: newQuestion._id } },
        { new: true }
      );

      // Save test cases
      if (testCases && testCases.length > 0) {
        for (const t of testCases) {
          const newTest = new TestCase({
            input: t.input,
            output: t.output,
            type: t.type || "Single-line",
            isHidden: t.isHidden || false,
            question: newQuestion._id,
          });
          await newTest.save();
        }
      }

      savedCount++;
    }

    res.json({
      message: `✅ ${savedCount} question${savedCount > 1 ? "s" : ""} saved and linked to your account!`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "DSA bot error",
      details: err.message,
    });
  }
};

// Initial system prompt for MCQ bot
let mcqHistory = [
  {
    role: "system",
    content: `
You are a coding assistant that responds ONLY with pure JSON without any Markdown syntax or headings.

Strict Rules:
- ❌ DO NOT add \`\`\`json or any \`\`\`.
- ❌ DO NOT write "Here are the questions" or any text.
- ❌ DO NOT add any whitespace outside json.
- ✅ Only pure JSON array must be output.

MCQ Question JSON structure:

[
  {
    "question": "String",
    "options": ["String", "String", "String", "String"],
    "correctAnswerIndex": Number,
    "difficulty": "String",
    "tags": ["String"]
  }
]

Behavior:
- If the user asks for "10 MCQs on ReactJS", reply with 10 JSON objects inside a single array.
- Never wrap or explain anything outside the JSON.
`
  }
];

export const handleMCQChat = async (req, res) => {
  try {
    const { message, quizID } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (!quizID) {
      return res.status(400).json({ error: "Quiz ID is required" });
    }

    const quiz = await Quiz.findById(quizID);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    mcqHistory.push({ role: "user", content: message });

    const trimmedHistory = [mcqHistory[0], ...mcqHistory.slice(-2)];
    const botRawReply = await responseBot(trimmedHistory);

    mcqHistory.push({ role: "assistant", content: botRawReply });

    let pureBotReply = botRawReply.trim();

    const firstBracketIndex = pureBotReply.indexOf("[");
    if (firstBracketIndex !== -1) {
      pureBotReply = pureBotReply.substring(firstBracketIndex);
    }

    let mcqQuestions;
    try {
      mcqQuestions = JSON.parse(pureBotReply);
      if (!Array.isArray(mcqQuestions)) {
        throw new Error("Bot response is not an array");
      }
    } catch (err) {
      console.error("❌ JSON Parse Error:", err.message);
      return res.status(400).json({ error: "Invalid JSON from bot", botReply: pureBotReply });
    }

    const allowedDifficulties = ["easy", "medium", "hard"];
    let savedCount = 0;
    let savedIds = [];

    for (const q of mcqQuestions) {
      const {
        question,
        options,
        correctAnswerIndex,
        difficulty,
        tags,
      } = q;

      if (!question || !Array.isArray(options) || typeof correctAnswerIndex !== "number") {
        console.error("❌ Invalid MCQ structure:", q);
        continue;
      }

      let formattedDifficulty = (difficulty || "medium").toLowerCase();
      if (!allowedDifficulties.includes(formattedDifficulty)) {
        formattedDifficulty = "medium";
      }

      const newMCQ = new QuizQuestion({
        text: question,
        type: "mcq",
        options: options,
        correctAnswerIndex: correctAnswerIndex,
        marks: 1,
        difficulty: formattedDifficulty,
        explanation: "",
        tags: Array.isArray(tags) ? tags : [],
        createdBy: req.admin?._id || null,
      });

      await newMCQ.save();
      savedIds.push(newMCQ._id);
      savedCount++;
    }

    await Quiz.findByIdAndUpdate(
      quizID,
      { $push: { questions: { $each: savedIds } } },
      { new: true }
    );

    res.json({
      message: `✅ ${savedCount} MCQ${savedCount !== 1 ? "s" : ""} added successfully.`,
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      error: "MCQ bot error",
      details: err.message,
    });
  }
};
