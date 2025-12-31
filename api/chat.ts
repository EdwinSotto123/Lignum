import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Chat API endpoint for Digital Twin conversations
 * Uses Gemini for generating responses with custom system instructions
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const { message, systemInstruction } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: message }] }],
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', errorData);
            return res.status(response.status).json({ error: 'Gemini API error' });
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return res.status(200).json({ response: textContent || '' });

    } catch (error: any) {
        console.error('Chat API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
