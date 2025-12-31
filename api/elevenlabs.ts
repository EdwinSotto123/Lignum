import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
    }

    try {
        const { action, text, voiceId, audioData, voiceName } = req.body;

        if (action === 'tts') {
            // Text-to-Speech
            if (!text || !voiceId) {
                return res.status(400).json({ error: 'text and voiceId are required' });
            }

            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY
                    },
                    body: JSON.stringify({
                        text: text.substring(0, 2500), // ElevenLabs limit
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.8,
                            style: 0.5,
                            use_speaker_boost: true
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs TTS error:', errorText);
                return res.status(response.status).json({ error: 'TTS failed', details: errorText });
            }

            // Return audio as base64
            const audioBuffer = await response.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');

            return res.status(200).json({
                audio: base64Audio,
                contentType: 'audio/mpeg'
            });

        } else if (action === 'clone') {
            // Voice cloning - requires multipart form data handling
            if (!audioData || !voiceName) {
                return res.status(400).json({ error: 'audioData and voiceName are required' });
            }

            // Convert base64 to buffer
            const audioBuffer = Buffer.from(audioData, 'base64');

            // Create FormData-like structure for ElevenLabs
            const formData = new FormData();
            formData.append('name', voiceName);
            formData.append('description', 'Cloned voice via Lignum');
            formData.append('files', new Blob([audioBuffer], { type: 'audio/webm' }), 'sample.webm');

            const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs clone error:', errorText);
                return res.status(response.status).json({ error: 'Clone failed', details: errorText });
            }

            const data = await response.json();
            return res.status(200).json({ voiceId: data.voice_id });

        } else if (action === 'voices') {
            // List voices
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: { 'xi-api-key': ELEVENLABS_API_KEY }
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: 'Failed to fetch voices' });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else {
            return res.status(400).json({ error: 'Invalid action. Use: tts, clone, or voices' });
        }

    } catch (error: any) {
        console.error('ElevenLabs API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
