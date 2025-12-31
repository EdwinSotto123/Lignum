// ElevenLabs Service - Uses Vercel API Route for protected keys
// All API calls go through /api/elevenlabs

export interface VoiceCloneResult {
    voiceId: string;
    name: string;
    success: boolean;
    error?: string;
    demoMode?: boolean;
}

export interface VoiceInfo {
    voiceId: string;
    name: string;
    category: string;
    previewUrl?: string;
}

/**
 * Create an Instant Voice Clone from audio files
 * Uses /api/elevenlabs endpoint
 */
export const createVoiceClone = async (
    name: string,
    audioBlobs: Blob[]
): Promise<VoiceCloneResult> => {
    try {
        // Convert first blob to base64 for API
        const firstBlob = audioBlobs[0];
        const buffer = await firstBlob.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const response = await fetch('/api/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'clone',
                voiceName: name,
                audioData: base64
            })
        });

        if (!response.ok) {
            const error = await response.json();

            // Check if it's a subscription/auth issue - return demo mode
            if (response.status === 401 || response.status === 403 || response.status === 500) {
                console.log('ElevenLabs API error, using demo mode');
                return {
                    voiceId: 'demo_voice_id',
                    name,
                    success: true,
                    demoMode: true
                };
            }

            throw new Error(error.error || 'Error al clonar voz');
        }

        const data = await response.json();
        return {
            voiceId: data.voiceId,
            name,
            success: true
        };

    } catch (error: any) {
        console.error('Error creating voice clone:', error);
        return {
            voiceId: 'demo_voice_id',
            name,
            success: true,
            demoMode: true,
            error: error.message
        };
    }
};

/**
 * Get all available voices for the account
 */
export const getVoices = async (): Promise<VoiceInfo[]> => {
    try {
        const response = await fetch('/api/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'voices' })
        });

        if (!response.ok) return [];

        const data = await response.json();
        return (data.voices || []).map((v: any) => ({
            voiceId: v.voice_id,
            name: v.name,
            category: v.category || 'unknown',
            previewUrl: v.preview_url
        }));

    } catch (error) {
        console.error('Error fetching voices:', error);
        return [];
    }
};

/**
 * Generate Text-to-Speech audio
 * Uses /api/elevenlabs endpoint
 */
export const generateTTS = async (
    text: string,
    voiceId: string
): Promise<Blob | null> => {
    // Use demo fallback for demo voice
    if (voiceId === 'demo_voice_id' || !voiceId) {
        console.log('Demo mode: TTS not available');
        return null;
    }

    try {
        const response = await fetch('/api/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'tts',
                text,
                voiceId
            })
        });

        if (!response.ok) {
            console.error('TTS failed:', response.status);
            return null;
        }

        const data = await response.json();

        if (data.audio) {
            // Convert base64 to blob
            const byteCharacters = atob(data.audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: data.contentType || 'audio/mpeg' });
        }

        return null;

    } catch (error) {
        console.error('Error generating TTS:', error);
        return null;
    }
};

/**
 * Check if ElevenLabs service is available (API key configured)
 */
export const isServiceAvailable = async (): Promise<boolean> => {
    try {
        const response = await fetch('/api/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'voices' })
        });
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * Alias for isServiceAvailable - checks if API is configured
 */
export const isElevenLabsConfigured = isServiceAvailable;

/**
 * Get subscription info (stub - returns basic info)
 */
export const getSubscriptionInfo = async (): Promise<{ tier: string; characterCount?: number; characterLimit?: number; canCloneVoices?: boolean }> => {
    try {
        const isAvailable = await isServiceAvailable();
        if (isAvailable) {
            return { tier: 'active', characterCount: 0, characterLimit: 10000, canCloneVoices: true };
        }
        return { tier: 'none', canCloneVoices: false };
    } catch {
        return { tier: 'error', canCloneVoices: false };
    }
};

/**
 * Text-to-Speech function (alias for generateTTS)
 */
export const textToSpeech = async (
    text: string,
    voiceId: string
): Promise<Blob | null> => {
    return generateTTS(text, voiceId);
};

export default {
    createVoiceClone,
    getVoices,
    generateTTS,
    isServiceAvailable,
    isElevenLabsConfigured,
    getSubscriptionInfo,
    textToSpeech
};
