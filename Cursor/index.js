import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const platform = os.platform();


const asyncExecute = promisify(exec);

const History = [];

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------------- SAFE EXECUTION ----------------
async function executeCommand({ command }) {
  try {
    //  basic safety filter
    if (command.includes("rm") || command.includes("del")) {
      return "❌ Dangerous command blocked";
    }

    const { stdout, stderr } = await asyncExecute(command);

    if (stderr) {
      return `Error: ${stderr}`;
    }

    return `Success: ${stdout}`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// ---------------- TOOL DECLARATION ----------------
const executeCommandDeclaration = {
  name: "executeCommand",
  description: "Execute a single terminal command",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: 'Example: "mkdir project"',
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand,
};

// ---------------- AGENT ----------------
async function runAgent(userProblem) {
  History.push({ role: "user", parts: [{ text: userProblem }] });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: History,
      config: {
        systemInstruction: `
You are a website builder AI.

OS: ${platform}

Steps:
1. Understand user request
2. Generate commands step-by-step
3. Use executeCommand tool

Example:
mkdir project
cd project
touch index.html
        `,
        tools: [
          {
            functionDeclarations: [executeCommandDeclaration],
          },
        ],
      },
    });

    const calls = response.functionCalls ?? [];

    if (calls.length > 0) {
      const call = calls[0];
      const { name, args } = call;

      console.log(`\n[Executing Tool]: ${name}`);

      const toolFunc = availableTools[name];
      const resultValue = await toolFunc(args);

      History.push({
        role: "model",
        parts: [{ functionCall: call }],
      });

      History.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name,
              response: { result: resultValue },
            },
          },
        ],
      });
    } else {
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

// ---------------- MAIN ----------------
async function main() {
  console.log(" I am Cursor AI: Let's build a website");

  while (true) {
    const input = readlineSync.question("\nAsk me anything --> ");

    if (input.toLowerCase() === "exit") {
      console.log("Goodbye ");
      break;
    }

    await runAgent(input);
  }
}

main();