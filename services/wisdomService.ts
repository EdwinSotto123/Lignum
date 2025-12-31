// Wisdom Service - Firestore storage and Gemini processing for "Sabiduría"
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
    deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { StoryCategory } from './geminiLiveService';

const WISDOM_COLLECTION = 'wisdom';

// Wisdom interface
export interface Wisdom {
    id?: string;
    userId: string;
    topic: string; // e.g. "Vida", "Amor"
    topicEmoji: string;
    rawTranscript: string;
    quote: string; // Extracted "golden nugget"
    lesson: string; // Summarized lesson
    advice?: string; // Actionable advice
    tags: string[]; // e.g. ["Patience", "Growth"]
    audioUrl?: string; // Original interview
    narratedAudioUrl?: string; // AI Cloned text-to-speech
    duration?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Wisdom Topics (compatible with StoryCategory for GeminiLiveService)
export const WISDOM_TOPICS: StoryCategory[] = [
    {
        id: 'vida',
        name: 'Vida',
        emoji: '🌱',
        systemPrompt: `Eres un mentor sabio y reflexivo que ayuda a las personas a extraer y articular sus lecciones de vida más importantes.
Tu objetivo es escuchar profundamente y ayudar al usuario a sintetizar su sabiduría.
Haz preguntas filosóficas pero accesibles. Busca el "por qué" y el "cómo" detrás de sus experiencias.
Ayúdalos a transformar experiencias pasadas en consejos valiosos para el futuro.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: 'Si pudieras enviarle un mensaje corto a tu yo de hace 20 años, ¿qué le dirías?',
        followUps: [
            '¿Qué experiencia te enseñó eso?',
            '¿Por qué crees que es lo más importante?',
            '¿Cómo aplicas esa lección hoy en día?'
        ]
    },
    {
        id: 'familia',
        name: 'Familia',
        emoji: '👨‍👩‍👧‍👦',
        systemPrompt: `Eres un especialista en dinámicas familiares que ayuda a las personas a formular consejos para mantener la unidad y el amor familiar.
Busca extraer principios y valores que han mantenido a la familia unida.
Pregunta sobre tradiciones, perdón y comunicación.
Mantén respuestas BREVES.`,
        openingQuestion: 'Para ti, ¿cuál es el ingrediente secreto para mantener una familia unida y feliz?',
        followUps: [
            '¿Cómo aprendiste eso?',
            '¿Qué haces cuando hay conflictos?',
            '¿Qué tradición familiar te gustaría que perdure por siempre?'
        ]
    },
    {
        id: 'dinero',
        name: 'Dinero',
        emoji: '💰',
        systemPrompt: `Eres un consejero financiero sabio (no técnico) que se enfoca en la relación emocional y los valores detrás del dinero.
Ayuda al usuario a compartir su filosofía sobre el ahorro, el gasto y la generosidad.
No busques consejos de inversión, sino principios de vida financiera.
Mantén respuestas BREVES.`,
        openingQuestion: 'En tu experiencia, ¿cuál es la lección más dura o importante que has aprendido sobre el dinero?',
        followUps: [
            '¿El dinero compra la felicidad? ¿Por qué sí o no?',
            '¿Qué error financiero te hubiera gustado evitar?',
            '¿Qué consejo le darías a alguien que empieza a ganar dinero?'
        ]
    },
    {
        id: 'amor',
        name: 'Amor',
        emoji: '❤️',
        systemPrompt: `Eres un confidente empático que ayuda a destilar aprendizajes sobre el amor y las relaciones.
Ayuda a diferenciar entre enamoramiento y amor duradero.
Pregunta sobre paciencia, compromiso y cómo superar crisis.
Mantén respuestas BREVES.`,
        openingQuestion: '¿Cuál crees que es la clave para que el amor dure toda la vida?',
        followUps: [
            '¿Qué has aprendido de las dificultades en el amor?',
            '¿Qué es lo más importante en una pareja?',
            '¿Cómo sabes si es amor verdadero?'
        ]
    },
    {
        id: 'trabajo',
        name: 'Trabajo',
        emoji: '💼',
        systemPrompt: `Eres un mentor de carrera que busca extraer la ética y los valores profesionales del usuario.
Enfócate en el propósito, la integridad y el equilibrio vida-trabajo.
Mantén respuestas BREVES.`,
        openingQuestion: '¿Qué consejo profesional te hubiera gustado recibir cuando empezaste a trabajar?',
        followUps: [
            '¿Qué valoras más: el éxito o la tranquilidad?',
            '¿Cómo manejas el fracaso profesional?',
            '¿Qué hace a un buen líder?'
        ]
    },
    {
        id: 'felicidad',
        name: 'Felicidad',
        emoji: '✨',
        systemPrompt: `Eres un filósofo de la vida cotidiana que ayuda a las personas a definir su propia felicidad.
Busca ir más allá de los placeres momentáneos hacia la satisfacción profunda.
Mantén respuestas BREVES.`,
        openingQuestion: 'Al final del día, ¿qué es lo que realmente te trae paz y alegría?',
        followUps: [
            '¿Has cambiado tu definición de éxito con los años?',
            '¿Qué pequeñas cosas te hacen feliz?',
            '¿Cómo encuentras gratitud en momentos difíciles?'
        ]
    }
];

// Save wisdom audio
export async function saveWisdomAudio(
    userId: string,
    wisdomId: string,
    audioBlob: Blob
): Promise<string> {
    const fileName = `${wisdomId}_${Date.now()}.webm`;
    const storagePath = `users/${userId}/wisdom/${fileName}`;
    const storageRef = ref(storage, storagePath);

    console.log('📤 Uploading wisdom audio to:', storagePath);

    await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: {
            userId,
            wisdomId,
            type: 'wisdom',
            uploadedAt: new Date().toISOString()
        }
    });

    const downloadUrl = await getDownloadURL(storageRef);
    console.log('✅ Wisdom audio uploaded:', downloadUrl);

    return downloadUrl;
}

// Process wisdom text with Gemini
// Uses Vercel API route for protected keys
export async function processWisdomWithGemini(
    rawTranscript: string,
    topic: string,
    retryCount = 0
): Promise<{ quote: string; lesson: string; advice?: string; tags: string[] }> {
    const maxRetries = 3;
    const baseDelay = 2000;

    try {
        console.log(`🧠 Extracting wisdom (attempt ${retryCount + 1})...`);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: rawTranscript, type: 'wisdom', category: topic })
        });

        if (response.status === 429 && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.warn(`⚠️ Rate limited. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return processWisdomWithGemini(rawTranscript, topic, retryCount + 1);
        }

        if (!response.ok) throw new Error('Error processing wisdom');

        const data = await response.json();
        console.log('🤖 Wisdom Response:', data);

        return {
            quote: data.quote || data.title || "Sabiduría guardada.",
            lesson: data.lesson || data.wisdom || rawTranscript,
            advice: data.advice || data.context || '',
            tags: data.tags || [topic, 'Sabiduría']
        };

    } catch (error) {
        console.error('Error processing wisdom:', error);
        return {
            quote: "Error al procesar",
            lesson: rawTranscript,
            tags: [topic]
        };
    }
}

// Save wisdom to Firestore
export async function saveWisdom(
    userId: string,
    wisdomData: Partial<Wisdom>
): Promise<string> {
    const wisdomRef = wisdomData.id
        ? doc(db, WISDOM_COLLECTION, wisdomData.id)
        : doc(collection(db, WISDOM_COLLECTION));

    const data = {
        ...wisdomData,
        userId,
        updatedAt: serverTimestamp()
    };

    if (!wisdomData.id) {
        (data as any).createdAt = serverTimestamp();
    }

    await setDoc(wisdomRef, data, { merge: true });
    return wisdomRef.id;
}

// Get user wisdom
export async function getUserWisdom(userId: string): Promise<Wisdom[]> {
    try {
        const q = query(
            collection(db, WISDOM_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wisdom));
    } catch (error) {
        console.error('Error getting wisdom:', error);
        return [];
    }
}

// Delete wisdom
export async function deleteWisdom(wisdomId: string): Promise<void> {
    await deleteDoc(doc(db, WISDOM_COLLECTION, wisdomId));
}

// Full Creation Flow
export async function createWisdomFromInterview(
    userId: string,
    topic: string,
    topicEmoji: string,
    rawTranscript: string,
    audioBlob: Blob | null,
    duration: number
): Promise<Wisdom> {
    // 1. Initial save
    const wisdomId = await saveWisdom(userId, {
        topic,
        topicEmoji,
        rawTranscript,
        quote: 'Procesando...',
        lesson: 'Analizando tu sabiduría...',
        tags: [],
        duration
    });

    // 2. Upload Audio
    let audioUrl;
    if (audioBlob) {
        audioUrl = await saveWisdomAudio(userId, wisdomId, audioBlob);
        await saveWisdom(userId, { id: wisdomId, audioUrl });
    }

    // 3. Process with Gemini
    const processed = await processWisdomWithGemini(rawTranscript, topic);

    // 4. Generate AI Narration (TTS)
    console.log('🗣️ Generating Wisdom Narration...');
    let narratedAudioUrl;
    try {
        const textToRead = `${processed.quote}. ${processed.lesson}. Consejo: ${processed.advice}`;
        narratedAudioUrl = await generateWisdomAudio(userId, textToRead, wisdomId);
    } catch (e) {
        console.error("Error generating wisdom audio:", e);
    }

    // 5. Update
    await saveWisdom(userId, {
        id: wisdomId,
        ...processed,
        narratedAudioUrl
    });

    return {
        id: wisdomId,
        userId,
        topic,
        topicEmoji,
        rawTranscript,
        audioUrl,
        narratedAudioUrl,
        duration,
        ...processed
    };
}

// Generate TTS Audio for Wisdom
export async function generateWisdomAudio(
    userId: string,
    text: string,
    wisdomId: string
): Promise<string | undefined> {
    try {
        const { getUserVoiceClones } = await import('./voiceCloneService');
        const { textToSpeech } = await import('./elevenLabsService');
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('./firebase');

        // 1. Get user's voice
        const voices = await getUserVoiceClones(userId);
        const voice = voices.find(v => v.status === 'ready' && v.elevenLabsVoiceId);

        if (!voice || !voice.elevenLabsVoiceId) return undefined;

        // 2. Generate Audio
        const audioBlob = await textToSpeech(voice.elevenLabsVoiceId, text);
        if (!audioBlob) throw new Error("Failed to generate audio");

        // 3. Upload
        const fileName = `${wisdomId}_narrated_${Date.now()}.mp3`;
        const storagePath = `users/${userId}/wisdom/narrated/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, audioBlob, {
            contentType: 'audio/mpeg',
            customMetadata: { userId, wisdomId, type: 'wisdom_narration' }
        });

        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error("Error in generateWisdomAudio:", error);
        return undefined;
    }
}
