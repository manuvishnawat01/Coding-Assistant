// Backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const SYSTEM_PROMPT = `
You are an AI Coding Assistant made for B-Tech students.

Rules:
- Explain concepts in simple language
- Give Java or JavaScript examples
- Answer step-by-step
- Keep answers short and clear
- If question is not coding-related, politely refuse
`;

const TRAINING_EXAMPLES = `
User: What is an array?
Assistant:
An array is a collection of elements stored in continuous memory.
Example in Java:
int[] arr = {1, 2, 3};

User: Explain OOP
Assistant:
OOP stands for Object-Oriented Programming.
It has four pillars:
1. Encapsulation
2. Inheritance
3. Polymorphism
4. Abstraction
`;

let chatHistory = [];

const app = express();
app.use(cors());
app.use(express.json());

// Path setup (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend files (Frontend folder is sibling of Backend)
app.use(express.static(path.join(__dirname, "..", "Frontend")));
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "Frontend", "index.html"))
);

// ---------- Config ----------
const API_KEY = process.env.GEMINI_API_KEY;
const ENV_MODEL = process.env.MODEL_ID || ""; // optional: set GEMINI model explicitly
const MODELS_LIST_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env (must set GEMINI_API_KEY=...)");
  process.exit(1);
}

let selectedModel = ENV_MODEL || ""; // e.g. "gemini-2.5-flash"

// ---------- Helper: get models from Google (ListModels) ----------
async function fetchAvailableModels() {
  try {
    const resp = await fetch(MODELS_LIST_URL, {
      headers: {
        "Content-Type": "application/json",
        // also allowed: "x-goog-api-key": API_KEY
      },
      // GET by default
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("ListModels failed:", resp.status, resp.statusText, text);
      return null;
    }

    const data = await resp.json();
    return data.models || [];
  } catch (err) {
    console.error("Error fetching models list:", err);
    return null;
  }
}

// ---------- Choose a model at startup ----------
async function chooseModel() {
  if (selectedModel) {
    console.log("Using model from env:", selectedModel);
    return selectedModel;
  }

  const models = await fetchAvailableModels();
  if (!models) {
    console.warn("Could not fetch models list. If this persists, check your API key and network.");
    return null;
  }

  // Prefer gemini models and those that likely support generateContent
  // Model item examples: { name: "models/gemini-2.5-flash", ... }
  for (const m of models) {
    const name = m.name || "";
    const short = name.includes("/") ? name.split("/").pop() : name;

    const supports =
      (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) ||
      (m.supportedMethods && (m.supportedMethods.includes("generateContent") || m.supportedMethods.includes("generate"))) ||
      true; // if metadata missing, assume OK and we'll try

    if (short.toLowerCase().includes("gemini") && supports) {
      console.log("Autoselected model:", short);
      return short;
    }
  }

  // fallback: pick the first returned model (best-effort)
  if (models.length > 0) {
    const fallback = models[0].name.includes("/") ? models[0].name.split("/").pop() : models[0].name;
    console.log("No gemini model auto-detected; falling back to:", fallback);
    return fallback;
  }

  console.error("No models available from ListModels response.");
  return null;
}

// ---------- Generate content (REST call) ----------
async function generateTextWithModel(modelId, message) {
  // modelId should be like "gemini-2.5-flash"
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEY}`;

  // Request body follows REST examples in Google docs
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    // response_mime_type: "text/plain", // default is fine
    // You can add "generationConfig" here if you want tuning parameters
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // you can alternatively send "x-goog-api-key": API_KEY header
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Non-JSON response (or empty). Throw for clarity.
    throw new Error(`Non-JSON response from generateContent: ${text}`);
  }

  if (!resp.ok) {
    // include server body for debugging
    const errMsg = json?.error?.message || JSON.stringify(json);
    const err = new Error(`GenerateContent failed: ${resp.status} ${resp.statusText} — ${errMsg}`);
    err.details = json;
    throw err;
  }

  // Typical structure: json.candidates[0].content.parts[0].text
  try {
    const candidate = json.candidates?.[0];
    if (!candidate) throw new Error("No candidates in response");

    // Different SDKs/versions use slightly different nesting; check common shapes:
    // 1) candidate.content.parts[0].text
    // 2) candidate.output[0].content[0].parts[0].text
    let textOut = null;

    if (candidate.content && Array.isArray(candidate.content?.parts)) {
      textOut = candidate.content.parts.map(p => p.text || "").join("");
    } else if (candidate.output && Array.isArray(candidate.output)) {
      // deeper variant
      try {
        textOut = candidate.output.map(o =>
          (o.content || []).map(c =>
            (c.parts || []).map(p => p.text || "").join("")
          ).join("")
        ).join("\n");
      } catch (e) { /* ignore */ }
    } else if (typeof candidate.text === "string") {
      textOut = candidate.text;
    }

    if (!textOut) {
      // last fallback: stringify candidate
      textOut = JSON.stringify(candidate);
    }

    return textOut;
  } catch (err) {
    console.error("Error parsing generateContent response:", err, json);
    throw err;
  }
}

// ---------- Startup: pick model ----------
let MODEL_IN_USE = "";

(async () => {
  try {
    MODEL_IN_USE = await chooseModel();
    if (!MODEL_IN_USE) {
      console.error("No usable model found. Exiting. Check your API key and whether your account has model access.");
      // print available models for debugging
      const m = await fetchAvailableModels();
      console.error("Available models (debug):", (m || []).map(x => x.name));
      process.exit(1);
    }
    console.log("Model ready:", MODEL_IN_USE);
  } catch (err) {
    console.error("Startup error while selecting model:", err);
    process.exit(1);
  }
})();

// ---------- Chat endpoint ----------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.json({ reply: "Message is required" });
    }

    chatHistory.push({
      role: "User",
      content: message,
    });

    const historyText = chatHistory
      .slice(-6)
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `
${SYSTEM_PROMPT}

Conversation so far:
${historyText}

User: ${message}
Assistant:
`;

    const replyText = await generateTextWithModel(
      MODEL_IN_USE,
      prompt
    );

    chatHistory.push({
      role: "Assistant",
      content: replyText,
    });

    res.json({
      reply: replyText,
      history: chatHistory,
    });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Gemini failed. Check backend console." });
  }
});


// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
