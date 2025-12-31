import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check API key
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const { prompt, category } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Eres un narrador experto de cuentos infantiles mágicos. 
Tu tarea es transformar esta historia en un formato estructurado para un libro ilustrado.

Historia/Idea original: "${prompt}"
Categoría: ${category || 'cuento'}

DEBES responder SOLO con un JSON válido con esta estructura exacta:
{
    "title": "Título creativo del cuento",
    "organizedStory": "La historia completa organizada y mejorada narrativamente",
    "characters": [
        {
            "name": "Nombre del personaje",
            "description": "Descripción física detallada",
            "personality": "Personalidad y rol en la historia",
            "visualPrompt": "Prompt para generar imagen del personaje en estilo Pixar/Disney 3D"
        }
    ],
    "scenes": [
        {
            "sceneNumber": 1,
            "description": "Descripción de la escena",
            "narrationText": "Texto de narración para esta página (2-3 oraciones)",
            "charactersInScene": ["Lista de personajes en la escena"],
            "visualPrompt": "Prompt cinematográfico detallado para generar imagen"
        }
    ]
}

Genera entre 4-8 escenas. Cada visualPrompt debe ser detallado para generar imágenes hermosas estilo Pixar.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 8000
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', errorData);
            return res.status(response.status).json({ error: 'Gemini API error', details: errorData });
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            return res.status(500).json({ error: 'No content from Gemini' });
        }

        // Parse JSON from response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Could not parse story structure', raw: textContent });
        }

        const storyData = JSON.parse(jsonMatch[0]);
        return res.status(200).json(storyData);

    } catch (error: any) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
