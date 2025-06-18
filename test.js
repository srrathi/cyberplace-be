// import { GoogleGenAI } from "@google/genai";
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AIzaSyCC-KUEeDDUu96P5sELFqGv2-Ade6qN0bg" });

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

main();