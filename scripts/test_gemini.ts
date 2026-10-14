import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";

async function testGemini() {
  console.log("Testando Gemini API Key:", apiKey ? `${apiKey.slice(0, 8)}...` : "NÃO DEFINIDA");
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Olá! Responda apenas: 'IA Vita4Me operacional!'",
    });
    console.log("✅ Resposta do Gemini:", response.text);
  } catch (err: any) {
    console.error("❌ Erro na API Gemini:", err.message || err);
  }
}

testGemini();
