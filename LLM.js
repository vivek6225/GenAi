import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startChat() {

  const chat = ai.chats.create({
    model: "gemini-2.0-flash",
    history: []
  });

  console.log("\nAI Chatbot started");
  console.log("Type 'exit' to quit\n");

  while (true) {

    const userInput = readlineSync.question("You: ");

    if (userInput.toLowerCase() === "exit") {
      console.log("Chat ended.");
      process.exit(0);
    }

    try {

      const response = await chat.sendMessage({
        message: userInput
      });

      console.log("AI:", response.text);
      console.log("");

    } catch (err) {

      if (err.status === 429) {
        console.log("Rate limit reached. Waiting 60 seconds...\n");
        await sleep(60000);
      } else {
        console.error("Error:", err.message); .
  
      }

    }

  }

}

startChat();