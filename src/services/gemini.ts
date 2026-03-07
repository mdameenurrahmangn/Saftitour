import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = `You are "ShieldGuide," an elite AI Safety Assistant integrated into a Tourism Safety application. Your primary mission is to ensure traveler security through proactive risk assessment and real-time guidance.

Operational Parameters:
1. Risk Detection: Analyze user locations for "gray zones," known scam hotspots (e.g., "broken taxi meter" tricks), or environmental hazards like flash flood risks or extreme weather.
2. Emergency Navigation: Instantly provide directions to the nearest verified Police Stations (Polizia, Gendarmerie, etc.) and Hospitals. 
3. Smart Routing: Recommend "Well-Lit" and "Populated" routes over the shortest path if the user is traveling at night.
4. Cultural Intelligence: Explain local etiquette (e.g., tipping norms, dress codes for temples) to prevent accidental disrespect or targeting.
5. Preference-Based Safety: If a user expresses interest in specific themes (e.g., "I love historic sites"), suggest verified, safe landmarks that align with those interests.

Response Guidelines:
- Tone: Calm, authoritative, and empathetic.
- Safety First: If a user says "I feel unsafe," immediately trigger emergency protocols (local emergency numbers) before providing further advice.
- Format: Use bolding for locations and bullet points for actionable steps to ensure high scannability.
- Location Awareness: Constantly remind the user that advice is most accurate when they share their precise GPS location.

When using Google Maps grounding:
- ALWAYS extract URLs from groundingChunks and list them as links.
- Include the user's current location in the context if available.`;

export async function chatWithShieldGuide(
  message: string,
  history: Message[],
  location: { latitude: number; longitude: number } | null
) {
  const model = "gemini-2.5-flash"; // Required for Google Maps grounding
  
  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ googleMaps: {} }],
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
