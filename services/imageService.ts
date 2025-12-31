// Image Generation Service - Uses Vercel API route for protected keys
// Falls back to direct SDK for local development

/**
 * Generate an illustration for a story scene using Gemini's image model.
 * @param scenePrompt - Detailed visual description of the scene.
 * @returns Base64 data URL of the generated image, or fallback URL.
 */
export async function generateSceneImage(scenePrompt: string): Promise<string> {
    console.log('🎨 Generating image for:', scenePrompt.substring(0, 50) + '...');

    try {
        // Use API route (works in both local dev with vercel dev and production)
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: scenePrompt })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.imageUrl) {
            console.log('✅ Image generated successfully', data.fallback ? '(fallback)' : '');
            return data.imageUrl;
        }

        throw new Error('No image URL in response');

    } catch (error: any) {
        console.error('❌ Image generation failed:', error?.message || error);
        return getFallbackImage(scenePrompt);
    }
}

/**
 * Generate a character portrait.
 * @param characterDescription - Visual description of the character.
 * @returns Base64 data URL or fallback.
 */
export async function generateCharacterImage(characterDescription: string): Promise<string> {
    return generateSceneImage(`Character portrait: ${characterDescription}. Close-up, expressive face, cute Pixar style.`);
}

/**
 * Get a fallback image from Picsum
 */
function getFallbackImage(prompt: string): string {
    const seed = prompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${seed}/800/600`;
}

export default { generateSceneImage, generateCharacterImage };
