const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function analyzeText(text) {

  if (process.env.FORCE_AI_FAILURE === "true") {
  throw new Error("Simulated AI provider failure");
}
  const prompt = `
Analyze the following customer message.

Return ONLY valid JSON in this format:
{
  "category": "complaint | question | feedback | other",
  "sentiment": "positive | neutral | negative",
  "priority": "low | medium | high"
}

Customer message:
${text}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  const result = response.text;

  const cleanedResult = result
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

return JSON.parse(cleanedResult);
}

module.exports = {
  analyzeText
};