import axios from "axios";
import { LANGUAGE_VERSIONS } from "./constant.js";

const API = axios.create({
  baseURL: "https://emkc.org/api/v2/piston", // Base URL for the execution API
});

const handleInputForLanguage = (input = "", language) => {
  if (language === "python") {
    const formattedInput = input
      .split("\n")
      .map((line) => {
        if (line.trim().includes(" ")) {
          return line
            .split(" ")
            .map((value) => value.trim())
            .join("\n");
        }
        return line.trim();
      })
      .join("\n");
    return formattedInput;
  }

  if (language === "javascript") {
    return input
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }

  return input; // Default for other languages
};

const normalizeOutput = (output) => output?.toString().trim().replace(/\r\n/g, "\n");

export const executeCode = async ({
  code = "",
  language = "python",
  testCases = [],
  stopOnFailure = true,
}) => {
  const results = [];
  let passedTestCases = 0;
  let errorDetails = null;

  for (let testCase of testCases) {
    const input = handleInputForLanguage(testCase?.input, language);
    const expectedOutput = testCase.output;

    try {
      const response = await API.post("/execute", {
        language,
        version: LANGUAGE_VERSIONS[language],
        files: [{ content: code }],
        stdin: input,
      });

      const { run } = response?.data || {};
      if (!run) throw new Error("Unexpected API response format");

      const { output, stderr, code: execCode } = run;

      if (
        stderr?.trim() ||
        execCode !== 0 ||
        normalizeOutput(output) !== normalizeOutput(expectedOutput)
      ) {
        results.push({
          input,
          expectedOutput,
          actualOutput: normalizeOutput(output),
          errorMessage: stderr?.trim() || "Output mismatch",
          status: "fail",
        });
        errorDetails = stderr?.trim();
        if (stopOnFailure) break;
      } else {
        passedTestCases++;
        results.push({
          input,
          expectedOutput,
          actualOutput: normalizeOutput(output),
          errorMessage: null,
          status: "pass",
        });
      }
    } catch (error) {
      console.error("Execution error:", {
        language,
        input,
        error: error.message,
        stack: error.stack,
      });
      results.push({
        input,
        expectedOutput,
        actualOutput: null,
        errorMessage: error.message,
        status: "fail",
      });
      if (stopOnFailure) break;
    }
  }

  return {
    totalTestCases: testCases.length,
    passedTestCases,
    errorDetails,
    results,
  };
};
