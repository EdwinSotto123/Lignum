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

        // Use Imagen 3 API for image generation
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        prompt: `Create a beautiful children's book illustration in a warm, Pixar-like 3D style. 
The image should be colorful, inviting, and magical. High quality, detailed.
Scene to illustrate: ${prompt}`
                    }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "16:9",
                        personGeneration: "allow_adult",
                        safetyFilterLevel: "block_only_high"
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Imagen API error:', errorText);

            // Try fallback to Gemini Flash with image generation
            try {
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Generate an image: A beautiful children's book illustration in Pixar-like 3D style. ${prompt}`
                                }]
                            }],
                            generationConfig: {
                                responseModalities: ["IMAGE"]
                            }
                        })
                    }
                );

                if (geminiResponse.ok) {
                    const geminiData = await geminiResponse.json();
                    const parts = geminiData.candidates?.[0]?.content?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData?.mimeType?.startsWith('image/')) {
                            const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            console.log('✅ Image generated via Gemini Flash');
                            return res.status(200).json({ imageUrl: base64Image });
                        }
                    }
                }
            } catch (geminiError) {
                console.error('Gemini fallback failed:', geminiError);
            }

            // Return Picsum fallback
            const seed = prompt.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
            return res.status(200).json({
                imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
                fallback: true
            });
        }

        const data = await response.json();

        // Imagen 3 returns predictions array with bytesBase64Encoded
        if (data.predictions && data.predictions.length > 0) {
            const imageData = data.predictions[0].bytesBase64Encoded;
            if (imageData) {
                const base64Image = `data:image/png;base64,${imageData}`;
                console.log('✅ Image generated via Imagen 3');
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
        const seed = Date.now();
        return res.status(200).json({
            imageUrl: `https://picsum.photos/seed/${seed}/1920/1080`,
            fallback: true,
            error: error.message
        });
    }
}
