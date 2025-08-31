import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config.js";
import adminRoutes from "./routes/adminRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import testCaseRoutes from "./routes/testCaseRoutes.js";
import timeRoutes from "./routes/timeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import batchRoutes from "./routes/batchRoutes.js"
import quizRoutes from "./routes/quizRoutes.js"
import quizQuestionRoutes from "./routes/quizQuestionRoutes.js"
import { errorHandler } from "./utils/errorHandler.js";
import chatbotRoute from "./routes/chatbotRoute.js"

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// Gzip compression
app.use(compression());

// Cookie parsing middleware
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    // origin: "https://dashing-pavlova-301bef.netlify.app",
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    credentials: true, // Allow cookies to be sent
  })
);

// app.use((req, res, next) => {
//   console.log("Cookies:", req.cookies);
//   next();
// });


// JSON body parser
app.use(express.json());

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// Routes
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);
app.use("/challenge", challengeRoutes);
app.use("/question", questionRoutes);
app.use("/testCase", testCaseRoutes);
app.use("/submission", submissionRoutes);

//chatbot
app.use("/chatbot",chatbotRoute)


// Quiz Routes
app.use('/api/batches', batchRoutes)
app.use('/api/quizzes', quizRoutes)
app.use('/api/quiz/questions', quizQuestionRoutes)


app.use("/time", timeRoutes); // the time route

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to the coding platform. Happy Coding! 💖");
});

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port 💖  ${PORT}`
  );
});

export default app;
