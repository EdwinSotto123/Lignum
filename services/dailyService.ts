// Daily Service - Firestore storage and Gemini processing for "Grabación Diaria"
import { db, storage } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    deleteDoc,
    limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { StoryCategory } from './geminiLiveService';

const DAILY_COLLECTION = 'daily_reflections';

// Daily Reflection Interface
export interface DailyEntry {
    id?: string;
    userId: string;
    prompt: string;
    date: string; // ISO format YYYY-MM-DD
    rawTranscript: string;
    summary: string; // "Highlight" of the day
    mood: 'happy' | 'calm' | 'thoughtful' | 'sad' | 'energetic'; // Derived from content
    moodEmoji: string;
    tags: string[]; // e.g. ["Family", "Work", "Gratitude"]
    audioUrl?: string; // Full audio
    duration?: number;
    createdAt?: Timestamp;
}

// "Journaling Companion" Category
export const DAILY_COMPANION: StoryCategory = {
    id: 'diario',
    name: 'Diario Personal',
    emoji: '📔',
    systemPrompt: `Eres un compañero de 'Journaling' empático y cálido. Tu objetivo es ayudar al usuario a reflexionar sobre su día.
Escucha activamente, valida sus sentimientos y haz preguntas suaves para profundizar.
No juzgues ni des consejos no solicitados. Simplemente acompaña la reflexión.
Sé tú quien guíe la conversación si se quedan callados.
Respuestas BREVES (1-2 oraciones).`,
    openingQuestion: 'Hola. Tómate un respiro. ¿Cómo te sientes realmente hoy?',
    followUps: [
        '¿Qué fue lo mejor de tu día?',
        '¿Hubo algo que te costara trabajo hoy?',
        '¿De qué te sientes agradecido en este momento?'
    ]
};

// Prompts for random selection
export const DAILY_PROMPTS = [
    "¿Qué aprendiste hoy que te gustaría que tus hijos recordaran?",
    "¿Qué decisión tomaste hoy de la que te sientes orgulloso/a?",
    "¿Qué momento de hoy te hizo sonreír?",
    "¿Hay algo que hoy te hizo reflexionar sobre la vida?",
    "¿Qué pequeño acto de amor hiciste o recibiste hoy?",
    "¿Qué te enseñó el día de hoy sobre ti mismo/a?",
    "¿Cuál fue el desafío más grande de hoy y cómo lo enfrentaste?",
    "Si pudieras congelar un momento de hoy, ¿cuál sería?"
];

// Save Audio
export async function saveDailyAudio(
    userId: string,
    entryId: string,
    audioBlob: Blob
): Promise<string> {
    const fileName = `${entryId}_${Date.now()}.webm`;
    const storagePath = `users/${userId}/daily/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: { userId, entryId, type: 'daily' }
    });

    return await getDownloadURL(storageRef);
}

// Process with Gemini: Highlight + Mood Analysis
// Uses Vercel API route for protected keys
export async function processDailyReflectionWithGemini(
    rawTranscript: string,
    retryCount = 0
): Promise<{ summary: string; mood: string; moodEmoji: string; tags: string[] }> {
    const maxRetries = 3;
    const baseDelay = 2000;

    try {
        console.log(`🧠 Analyzing day (attempt ${retryCount + 1})...`);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: rawTranscript, type: 'daily' })
        });

        if (response.status === 429 && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            await new Promise(r => setTimeout(r, delay));
            return processDailyReflectionWithGemini(rawTranscript, retryCount + 1);
        }

        if (!response.ok) throw new Error('Error processing daily reflection');

        const data = await response.json();
        console.log('🤖 Daily Response:', data);

        return {
            summary: data.summary || 'Reflexión del día',
            mood: data.mood || 'thoughtful',
            moodEmoji: data.moodEmoji || '🤔',
            tags: data.tags || ['Reflexión']
        };

    } catch (error) {
        console.error('Error processing daily:', error);
        return {
            summary: "Error al analizar",
            mood: "calm",
            moodEmoji: "😌",
            tags: []
        };
    }
}

// Save to Firestore
export async function saveDailyEntry(
    userId: string,
    entryData: Partial<DailyEntry>
): Promise<string> {
    const entryRef = entryData.id
        ? doc(db, DAILY_COLLECTION, entryData.id)
        : doc(collection(db, DAILY_COLLECTION));

    const data = {
        ...entryData,
        userId,
        updatedAt: serverTimestamp()
    };

    if (!entryData.id) {
        (data as any).createdAt = serverTimestamp();
        (data as any).date = new Date().toISOString().split('T')[0]; // Store today's date YYYY-MM-DD
    }

    await setDoc(entryRef, data, { merge: true });
    return entryRef.id;
}

export async function getUserDailyEntries(userId: string): Promise<DailyEntry[]> {
    const q = query(
        collection(db, DAILY_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyEntry));
}

// Get streak (consecutive days)
export async function getUserStreak(userId: string): Promise<number> {
    // This is a simplified streak calculation (fetching last 30 entries)
    // In production, would be better to store 'streak' in user profile
    try {
        const q = query(
            collection(db, DAILY_COLLECTION),
            where('userId', '==', userId),
            orderBy('date', 'desc'),
            limit(30)
        );
        const snapshot = await getDocs(q);
        const dates = snapshot.docs.map(d => d.data().date);

        if (dates.length === 0) return 0;

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If no entry today yet, check if last entry was yesterday to continue streak
        // If entry today, start streak from today

        let currentDateCheck = dates.includes(today) ? today : yesterday;

        // If last entry is older than yesterday, streak is broken (0 or 1 if just did today)
        if (!dates.includes(today) && !dates.includes(yesterday)) {
            return 0;
        }

        // Count consecutive
        while (dates.includes(currentDateCheck)) {
            streak++;
            const prevDate = new Date(new Date(currentDateCheck).getTime() - 86400000).toISOString().split('T')[0];
            currentDateCheck = prevDate;
        }

        return streak;
    } catch (e) {
        console.error("Error calculating streak", e);
        return 0;
    }
}

// Creation Flow
export async function createDailyEntryFromInterview(
    userId: string,
    prompt: string,
    rawTranscript: string,
    audioBlob: Blob | null,
    duration: number
): Promise<DailyEntry> {
    // 1. Initial Save
    const entryId = await saveDailyEntry(userId, {
        prompt,
        rawTranscript,
        summary: 'Procesando tu día...',
        mood: 'calm',
        moodEmoji: '⏳',
        tags: [],
        duration
    });

    // 2. Audio
    let audioUrl;
    if (audioBlob) {
        audioUrl = await saveDailyAudio(userId, entryId, audioBlob);
        await saveDailyEntry(userId, { id: entryId, audioUrl });
    }

    // 3. Process
    const processed = await processDailyReflectionWithGemini(rawTranscript);

    // 4. Update
    await saveDailyEntry(userId, { id: entryId, ...processed } as any);

    return {
        id: entryId,
        userId,
        prompt,
        rawTranscript,
        audioUrl,
        duration,
        date: new Date().toISOString().split('T')[0],
        ...processed,
        mood: processed.mood as any
    } as DailyEntry;
}
