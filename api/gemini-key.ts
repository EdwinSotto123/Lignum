import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * This endpoint returns the Gemini API key for client-side SDK usage
 * (e.g., Gemini Live WebSocket connections that cannot be proxied).
 * 
 * NOTE: This is less secure than full API proxying, but keeps the key
 * out of the frontend bundle. The key is fetched at runtime only when needed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Return the key (only accessible at runtime, not bundled)
    // Consider adding authentication checks here for production
    return res.status(200).json({ key: apiKey });
}
