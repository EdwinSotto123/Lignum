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

        // Use Gemini 2.5 Flash with image generation (as specified by user)
        const imagePrompt = `Create a beautiful children's book illustration in a warm, Pixar-like 3D style. 
The image should be colorful, inviting, and magical. High quality, detailed.
Scene to illustrate: ${prompt}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: imagePrompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"]
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini 2.5 Flash API error:', errorText);

            // Return Picsum fallback
            const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
            return res.status(200).json({
                imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
                fallback: true
            });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        // Find image part in response
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                console.log('✅ Image generated via Gemini 2.5 Flash');
                return res.status(200).json({ imageUrl: base64Image });
            }
        }

        // Fallback if no image in response
        console.log('⚠️ No image in response, using fallback');
        const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
        return res.status(200).json({
            imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
            fallback: true
        });

    } catch (error: any) {
        console.error('Image generation error:', error);
        const seed = Date.now();
        return res.status(200).json({
            imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
            fallback: true,
            error: error.message
        });
    }
}
