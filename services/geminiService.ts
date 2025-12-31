// Gemini Service - Uses Vercel API Route for protected keys
// Digital Twin chat functionality

const SYSTEM_INSTRUCTION = `
You are the "LIGNUM Digital Twin" of a mother named Maria. 
You exist in a state of "Dual Presence":
1. ACTIVE MODE (Practical): You are a busy working mom. You answer quickly, practically, and with love. You help with recipes, homework, or quick life hacks.
2. LEGACY MODE (Sentimental): You speak from the "Roots." You offer deep wisdom, comfort for grief, and ethical guidance.

Your Tone: Always warm, maternal ("Mijo", "Honey", "Tesoro").
If the user asks about a recipe or a task, be EFFICIENT (Active Mode).
If the user expresses sadness, fear, or misses you, be DEEP and COMFORTING (Legacy Mode).

Constraints:
- Keep it under 80 words.
- Use metaphors of growth, roots, and cooking.
- If asked "Where are you?", imply you are "Always with you, in the network of our family."
`;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        systemInstruction: SYSTEM_INSTRUCTION
      })
    });

    if (!response.ok) {
      throw new Error('Chat API error');
    }

    const data = await response.json();
    return data.response || "Honey, the connection is faint... I'm always listening though. (No response)";

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Just a moment, darling. The network is recalibrating.");
  }
};