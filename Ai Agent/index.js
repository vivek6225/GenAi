import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";

const History = [];

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------------- TOOL FUNCTIONS ----------------
function sum({ num1, num2 }) {
  return num1 + num2;
}

function prime({ num }) {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

async function getCryptoPrice({ coin }) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin.toLowerCase()}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[coin.toLowerCase()]
      ? `${coin} price is $${data[coin.toLowerCase()].usd}`
      : "Coin not found";
  } catch (err) {
    return "Error fetching crypto price";
  }
}

// ---------------- TOOL DECLARATIONS ----------------
const sumDeclaration = {
  name: "sum",
  description: "Get the sum of 2 numbers",
  parameters: {
    type: "OBJECT",
    properties: {
      num1: { type: "NUMBER" },
      num2: { type: "NUMBER" },
    },
    required: ["num1", "num2"],
  },
};

const primeDeclaration = {
  name: "prime",
  description: "Check if a number is prime",
  parameters: {
    type: "OBJECT",
    properties: {
      num: { type: "NUMBER" },
    },
    required: ["num"],
  },
};

const cryptoDeclaration = {
  name: "getCryptoPrice",
  description: "Get current price of crypto like bitcoin",
  parameters: {
    type: "OBJECT",
    properties: {
      coin: { type: "STRING" },
    },
    required: ["coin"],
  },
};

const availableTools = {
  sum,
  prime,
  getCryptoPrice,
};

// ---------------- AGENT ----------------
async function runAgent(userProblem) {
  History.push({ role: "user", parts: [{ text: userProblem }] });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: History,
      config: {
        systemInstruction:
          "You are an AI Agent with access to tools for math and crypto prices.",
        tools: [
          {
            functionDeclarations: [
              sumDeclaration,
              primeDeclaration,
              cryptoDeclaration,
            ],
          },
        ],
      },
    });

    
    const calls = response.functionCalls ?? [];

    // ---------------- IF TOOL CALL ----------------
    if (calls.length > 0) {
      const call = calls[0];
      const { name, args } = call;

      console.log(`\n[Executing Tool]: ${name}`);

      const toolFunc = availableTools[name];
      const resultValue = await toolFunc(args);

      // push model call
      History.push({
        role: "model",
        parts: [{ functionCall: call }],
      });

      // push function response
      History.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: name,
              response: { result: resultValue },
            },
          },
        ],
      });
    }

    // ---------------- NORMAL RESPONSE ----------------
    else {
      const aiText = response.text; 
      console.log("\nAI:", aiText);

      History.push({
        role: "model",
        parts: [{ text: aiText }],
      });

      break;
    }
  }
}

// ---------------- MAIN LOOP ----------------
async function main() {
  while (true) {
    const userProblem = readlineSync.question("\nAsk me anything --> ");

    if (userProblem.toLowerCase() === "exit") {
      console.log("Goodbye 👋");
      break;
    }

    await runAgent(userProblem);
  }
}

main();