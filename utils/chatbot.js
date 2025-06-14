// import OpenAI from 'openai';
// import dotenv from "dotenv";

// dotenv.config();

// const openai = new OpenAI({
//   baseURL: process.env.OPENAI_BASE_URL,
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const responseBot = async (messages) => {
//   const response = await openai.chat.completions.create({
//     model: 'Provider-9/gpt-4.1',
//     messages,
//     temperature: 0.7,
//     max_tokens: 4000,
//   });

//   return response.choices[0].message.content;
// };
import OpenAI from 'openai';
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.HTTP_REFERER || "", 
    "X-Title": process.env.X_TITLE || "",           
  }
});

export const responseBot = async (messages) => {
  const response = await openai.chat.completions.create({
    model: 'qwen/qwen3-30b-a3b:free',  // <-- fixed model ID
    messages,
    temperature: 0.7,
    max_tokens: 4000,
  });
  

  return response.choices[0].message.content;
};
