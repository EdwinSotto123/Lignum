import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('🎨 Generating image for:', prompt.substring(0, 50) + '...');

        // Call Gemini image generation API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-generation:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create a beautiful children's book illustration in a warm, Pixar-like 3D style. 
The image should be colorful, inviting, and magical. High quality, detailed.
Scene to illustrate: ${prompt}`
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ["TEXT", "IMAGE"]
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini Image API error:', errorText);

            // Return fallback image URL
            const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
            return res.status(200).json({
                imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
                fallback: true
            });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        // Find image part
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                return res.status(200).json({ imageUrl: base64Image });
            }
        }

        // Fallback if no image
        const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
        return res.status(200).json({
            imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
            fallback: true
        });

    } catch (error: any) {
        console.error('Image generation error:', error);
        // Always return a fallback
        const seed = Date.now();
        return res.status(200).json({
            imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
            fallback: true,
            error: error.message
        });
    }
}
