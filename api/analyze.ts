import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * General-purpose Gemini API route for all analysis tasks
 * Supports: story, daily, recipe, wisdom, and raw prompts
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const { prompt, type, category } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        let systemPrompt = '';

        // Build system prompt based on type
        switch (type) {
            case 'daily':
                systemPrompt = `Eres un analista emocional de ÉLITE y RESTAURADOR.
TU MISIÓN: Entender qué siente el usuario realmente, ignorando errores de transcripción.

REGLAS:
1. "summary": Resume el evento clave o pensamiento del día (1 oración).
2. "mood": Detecta la emoción REAL (happy/calm/thoughtful/sad/energetic).
3. "moodEmoji": Emoji preciso.
4. "tags": 3 etiquetas temáticas.

RESPONDE SOLO JSON: { "summary": "...", "mood": "...", "moodEmoji": "...", "tags": [...] }

ENTRADA: "${prompt}"`;
                break;

            case 'recipe':
                const isCooking = ['cocina', 'reposteria', 'remedios'].includes(category);
                const itemLabel = isCooking ? 'Ingredientes' : 'Materiales/Herramientas';
                systemPrompt = `Eres un Chef Ejecutivo y RESTAURADOR de recetas orales.
TAREA: Reconstruir una receta profesional de esta transcripción con errores.

REGLAS:
1. "title": Nombre atractivo del plato.
2. "description": Breve intro apetecible.
3. "${itemLabel}": Lista estructurada con cantidades.
4. "steps": Pasos numerados y claros.
5. "tips": 2-3 consejos del Chef.

RESPONDE SOLO JSON: { "title": "...", "description": "...", "${itemLabel}": [...], "steps": [...], "tips": [...] }

ENTRADA: "${prompt}"`;
                break;

            case 'wisdom':
                systemPrompt = `Eres un SABIO CONSEJERO familiar de élite.
TAREA: Extraer sabiduría de esta grabación para preservarla para la familia.

REGLAS:
1. "title": Título inspirador para la sabiduría.
2. "wisdom": La enseñanza principal en 2-3 oraciones.
3. "context": Contexto de vida del que viene la sabiduría.
4. "tags": 3-5 etiquetas temáticas.

RESPONDE SOLO JSON: { "title": "...", "wisdom": "...", "context": "...", "tags": [...] }

ENTRADA: "${prompt}"`;
                break;

            case 'story':
            default:
                systemPrompt = `Eres un narrador experto de cuentos infantiles mágicos.
Transforma esta historia en un libro ilustrado estructurado.

RESPONDE JSON:
{
    "title": "Título creativo",
    "organizedStory": "Historia completa",
    "characters": [{ "name": "...", "description": "...", "personality": "...", "visualPrompt": "..." }],
    "scenes": [{ "sceneNumber": 1, "description": "...", "narrationText": "...", "charactersInScene": [...], "visualPrompt": "..." }]
}

ENTRADA: "${prompt}"`;
                break;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: {
                        temperature: type === 'story' ? 0.9 : 0.7,
                        maxOutputTokens: type === 'story' ? 8000 : 4000
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
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.status(200).json(parsed);
        }

        return res.status(200).json({ raw: textContent });

    } catch (error: any) {
        console.error('API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
