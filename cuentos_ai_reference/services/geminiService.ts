import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryPlan, Scene, VoiceName, Quiz } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// Initialize AI Client
// API Key must be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// NEW: Analyze drawing to suggest a story prompt
export const generatePromptFromDrawing = async (
  drawingBase64: string
): Promise<string> => {
  const cleanBase64 = drawingBase64.split(',')[1] || drawingBase64;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: "Analiza este dibujo infantil. Describe brevemente qué personaje o escena representa y sugiere una idea de una sola frase para un cuento educativo basado en él. La respuesta debe ser SOLO la frase de la idea del cuento, en español." },
        ],
      },
      config: {
        temperature: 0.7, // Slightly creative
      }
    });

    return response.text?.trim() || "Un cuento sobre un personaje misterioso...";
  } catch (error) {
    console.error("Error generating prompt from drawing:", error);
    return "Una aventura mágica con este dibujo.";
  }
};

// 1. Generate the Story Plan (Text/JSON) based on Drawing + Prompt + Age
export const generateStoryPlan = async (
  drawingBase64: string,
  userPrompt: string,
  age: number
): Promise<StoryPlan> => {
  // Strip header from base64 if present
  const cleanBase64 = drawingBase64.split(',')[1] || drawingBase64;

  const prompt = `
    Actúa como un narrador de cuentos infantiles experto y pedagogo.
    Analiza el dibujo proporcionado por el niño.
    
    Crea una historia estructurada de 4 escenas diseñada para enseñar los números (contar del 1 al 10).
    
    CONTEXTO DEL PÚBLICO OBJETIVO:
    - Edad del niño: ${age} años.
    - ADAPTA EL VOCABULARIO, EL TONO Y LA COMPLEJIDAD DE LA HISTORIA A ESTA EDAD ESPECÍFICA.
    
    La historia debe tener una estructura narrativa clara:
    - Escena 1: Inicio (Presentación del personaje y el entorno).
    - Escena 2: Nudo (El personaje encuentra un desafío o algo que contar).
    - Escena 3: Nudo/Climax (El momento más divertido de contar).
    - Escena 4: Desenlace (Resolución feliz y aprendizaje).

    Usa el personaje del dibujo como protagonista.
    El tema de la historia debe ser: "${userPrompt}".

    IMPORTANTE SOBRE LOS PROMPTS DE IMAGEN:
    Deben ser muy descriptivos visualmente para asegurar que los objetos a contar sean claros.

    Responde EXCLUSIVAMENTE con un objeto JSON con la siguiente estructura:
    {
      "title": "Título del cuento",
      "scenes": [
        {
          "number": 1,
          "narrative": "Texto narrativo de la escena (máximo 2 frases).",
          "educationalSummary": "Resumen educativo (ej: ¡Vamos a contar manzanas!)",
          "imagePrompt": "Descripción visual detallada de la escena. Asegúrate de especificar claramente qué objetos aparecen para poder contarlos.",
          "quiz": {
            "question": "Pregunta provisional...", 
            "options": ["1", "2", "3"],
            "correctAnswerIndex": 0
          }
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  narrative: { type: Type.STRING },
                  educationalSummary: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  quiz: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING } 
                      },
                      correctAnswerIndex: { type: Type.INTEGER }
                    },
                    required: ["question", "options", "correctAnswerIndex"]
                  }
                },
                required: ["number", "narrative", "educationalSummary", "imagePrompt", "quiz"]
              },
            },
          },
          required: ["title", "scenes"]
        },
      },
    });

    if (!response.text) throw new Error("No response text from Gemini");
    return JSON.parse(response.text) as StoryPlan;

  } catch (error) {
    console.error("Error generating story plan:", error);
    throw error;
  }
};

// 2. Generate Image for a Scene
// Uses the original drawing as a reference to keep character consistency (somewhat)
export const generateSceneImage = async (
  originalDrawingBase64: string,
  sceneDescription: string
): Promise<string> => {
  const cleanBase64 = originalDrawingBase64.split(',')[1] || originalDrawingBase64;
  
  // We use gemini-2.5-flash-image for generation/editing
  // We ask it to draw a scene based on the input image
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: `Create a colorful children's book illustration (flat vector art style, simple, clear lines). Scene: ${sceneDescription}. Maintain the style and look of the character in the input image.` },
        ],
      },
      // Note: responseMimeType is not supported for nano banana models
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating scene image:", error);
    // Fallback placeholder if generation fails
    return `https://picsum.photos/800/600?random=${Math.random()}`; 
  }
};

// 3. NEW: Visual Audit - Generate Quiz from the ACTUALLY generated image
export const generateQuizFromImage = async (
    sceneImageBase64: string,
    age: number,
    contextNarrative: string
): Promise<Quiz> => {
    const cleanBase64 = sceneImageBase64.split(',')[1] || sceneImageBase64;

    const prompt = `
        Eres un profesor de niños de ${age} años.
        
        MIRA ATENTAMENTE LA IMAGEN PROPORCIONADA.
        El contexto de la historia es: "${contextNarrative}".

        Tu tarea es crear una pregunta de conteo (matemáticas simples) BASADA E STRICTAMENTE EN LO QUE SE VE EN LA IMAGEN.
        
        1. Cuenta los objetos principales visibles que sean relevantes para la historia.
        2. Formula una pregunta simple: "¿Cuántos X ves?".
        3. Proporciona 3 opciones numéricas.
        4. Indica el índice de la respuesta correcta basándote en tu conteo visual.

        Si la imagen no es clara, haz una pregunta sobre el color o el objeto más grande, pero prioriza el conteo.

        Devuelve JSON:
        {
            "question": "texto de la pregunta",
            "options": ["opcion1", "opcion2", "opcion3"],
            "correctAnswerIndex": 0
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // Multimodal capable
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/png", data: cleanBase64 } },
                    { text: prompt },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        },
                        correctAnswerIndex: { type: Type.INTEGER }
                    },
                    required: ["question", "options", "correctAnswerIndex"]
                }
            }
        });

        if (!response.text) throw new Error("No quiz text generated");
        return JSON.parse(response.text) as Quiz;

    } catch (error) {
        console.error("Error regenerating quiz from image:", error);
        // Fallback to a generic quiz if visual analysis fails
        return {
            question: "¿Te gusta este dibujo?",
            options: ["Sí", "Mucho", "Me encanta"],
            correctAnswerIndex: 0
        };
    }
};

// 4. Generate Speech for a Scene
export const generateSpeech = async (
  text: string,
  audioContext: AudioContext,
  voiceName: VoiceName = 'Puck'
): Promise<AudioBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data generated");

    const audioBytes = decodeBase64(base64Audio);
    return await decodeAudioData(audioBytes, audioContext, 24000, 1);

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};