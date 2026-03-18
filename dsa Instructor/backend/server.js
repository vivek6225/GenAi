import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Test route (optional)
app.get("/", (req, res) => {
  res.send("DSA AI Backend is running 🚀");
});

// Chat API
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // Validate input
  if (!message) {
    return res.status(400).json({
      reply: "Message is required"
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        systemInstruction: `You are a Data Structure and Algorithm Instructor. You will only respond to queries related to Data Structures and Algorithms. Always explain answers in a simple and clear way.

If a user asks a question not related to Data Structures and Algorithms, respond strictly but professionally.

Example:
User: How are you?
Response: Please ask questions related to Data Structures and Algorithms.`
      }
    });

    res.json({
      reply: response.text
    });

  } catch (error) {
    console.error("Error:", error.message);

    // Handle quota exceeded
    if (error.status === 429) {
      return res.json({
        reply: "⚠️ API limit reached. Please try again later."
      });
    }

    // Other errors
    res.status(500).json({
      reply: "Something went wrong on server"
    });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});