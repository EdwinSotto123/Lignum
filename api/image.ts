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

        // Use the exact model name from user reference: gemini-2.5-flash-image
        // This model is colloquially known as "Nano Banana"
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create a beautiful children's book illustration (flat vector art style, simple, clear lines). Scene: ${prompt}`
                        }]
                    }]
                    // Removing generationConfig as it might not be supported/needed for this model in this context
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini Image API Error (${response.status}):`, errorText);

            // Fallback to Picsum
            const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
            return res.status(200).json({
                imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
                fallback: true,
                errorDetails: errorText
            });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        // Find image part in response
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/') || part.inlineData?.data) {
                const mimeType = part.inlineData?.mimeType || 'image/png';
                const base64Image = `data:${mimeType};base64,${part.inlineData.data}`;
                console.log('✅ Image generated successfully');
                return res.status(200).json({ imageUrl: base64Image });
            }
        }

        // Fallback if no image in response
        console.log('⚠️ No image in response candidates');
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
