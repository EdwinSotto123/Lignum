// Recipe/Skill Service - Firestore storage and Gemini processing
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

const RECIPES_COLLECTION = 'recipes';

// Recipe/Skill Element
export interface RecipeItem {
    id?: string;
    userId: string;
    type: 'cocina' | 'habilidad'; // Cooking or Skill
    category: string; // e.g. "Repostería", "Jardinería"
    categoryEmoji: string;
    title: string;
    description: string;
    items: string[]; // Ingredients or Materials
    steps: string[]; // Instructions
    tips: string; // "Secretos de la abuela"
    difficulty: 'easy' | 'medium' | 'hard';
    time?: string;
    rawTranscript: string;
    audioUrl?: string; // Full narration audio
    narratedAudioUrl?: string; // AI Cloned text-to-speech
    videoUrl?: string; // User uploaded video
    imageUrl?: string; // Optional image
    duration?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Categories compatible with GeminiLiveService
export const RECIPE_CATEGORIES: StoryCategory[] = [
    {
        id: 'cocina', // This maps to 'cocina' type
        name: 'Cocina',
        emoji: '🍳',
        systemPrompt: `Eres un Chef Ejecutivo amable y paciente. Tu trabajo es entrevistar a alguien para documentar su receta familiar.
Haz preguntas una por una para obtener:
1. El nombre del plato
2. Los ingredientes exactos (guíalos para que den cantidades)
3. Los pasos detallados de preparación
4. Tiempos de cocción
5. Secretos o trucos especiales
¡Anímalos y celebra sus conocimientos culinarios! Sé breve.`,
        openingQuestion: '¡Qué rico! ¿Qué plato vamos a cocinar hoy? Dime el nombre.',
        followUps: ['¿Qué ingredientes necesitamos?', '¿Cuál es el primer paso?', '¿Algún secreto especial para que quede delicioso?']
    },
    {
        id: 'reposteria',
        name: 'Repostería',
        emoji: '🧁',
        systemPrompt: `Eres un Maestro Pastelero detallista. Ayuda al usuario a documentar su receta de postre.
La precisión es clave en repostería. Pregunta por cantidades exactas y tiempos de horno.
Sé breve.`,
        openingQuestion: 'Me encanta la repostería. ¿Qué dulce maravilla vamos a preparar?',
        followUps: ['¿Qué ingredientes lleva?', '¿A qué temperatura el horno?', '¿Cómo sabemos que está listo?']
    },
    {
        id: 'remedios',
        name: 'Remedios',
        emoji: '🌿',
        systemPrompt: `Eres un experto en medicina natural y remedios caseros. Documenta la sabiduría curativa del usuario.
Pregunta por las hierbas, la preparación y para qué sirve el remedio.
Sé respetuoso y breve.`,
        openingQuestion: 'Los remedios naturales son tesoros. ¿Qué remedio quieres compartir hoy?',
        followUps: ['¿Qué plantas necesitamos?', '¿Cómo se prepara?', '¿Cómo se debe tomar o aplicar?']
    },
    {
        id: 'habilidad', // Generic skill/manualidades fallback
        name: 'Habilidad/Manualidad',
        emoji: '🔧',
        systemPrompt: `Eres un instructor experto en oficios y manualidades. Ayuda al usuario a enseñar su habilidad paso a paso.
Pide los materiales necesarios, herramientas y el procedimiento lógico.
Sé breve y práctico.`,
        openingQuestion: 'Es genial transmitir conocimientos prácticos. ¿Qué habilidad o proyecto vamos a documentar?',
        followUps: ['¿Qué herramientas necesitamos?', 'Explícame el primer paso.', '¿Algún consejo de seguridad o truco?']
    }
];

// Save Recipe Audio
export async function saveRecipeAudio(
    userId: string,
    recipeId: string,
    audioBlob: Blob
): Promise<string> {
    const fileName = `${recipeId}_${Date.now()}.webm`;
    const storagePath = `users/${userId}/recipes/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: { userId, recipeId, type: 'recipe' }
    });

    return await getDownloadURL(storageRef);
}

// Process with Gemini to extract structured JSON
// Uses Vercel API route for protected keys
export async function processRecipeWithGemini(
    rawTranscript: string,
    categoryType: string,
    retryCount = 0
): Promise<Partial<RecipeItem>> {
    const maxRetries = 3;
    const baseDelay = 2000;

    try {
        console.log(`🧠 Processing recipe (attempt ${retryCount + 1})...`);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: rawTranscript, type: 'recipe', category: categoryType })
        });

        if (response.status === 429 && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            await new Promise(r => setTimeout(r, delay));
            return processRecipeWithGemini(rawTranscript, categoryType, retryCount + 1);
        }

        if (!response.ok) throw new Error('Error processing recipe');

        const data = await response.json();
        console.log('🤖 Recipe Response:', data);

        return {
            title: data.title || 'Borrador de Receta',
            description: data.description || '',
            items: data.items || data.Ingredientes || data['Materiales/Herramientas'] || [],
            steps: data.steps || [],
            tips: data.tips || '',
            difficulty: data.difficulty || 'medium',
            time: data.time || '30 mins'
        };

    } catch (error) {
        console.error('Error processing recipe:', error);
        return {
            title: "Borrador de Receta",
            description: "No se pudo procesar automáticamente.",
            items: [],
            steps: [rawTranscript]
        };
    }
}

// Save to Firestore
export async function saveRecipe(
    userId: string,
    recipeData: Partial<RecipeItem>
): Promise<string> {
    const recipeRef = recipeData.id
        ? doc(db, RECIPES_COLLECTION, recipeData.id)
        : doc(collection(db, RECIPES_COLLECTION));

    const data = {
        ...recipeData,
        userId,
        updatedAt: serverTimestamp()
    };

    if (!recipeData.id) {
        (data as any).createdAt = serverTimestamp();
    }

    await setDoc(recipeRef, data, { merge: true });
    return recipeRef.id;
}

export async function getUserRecipes(userId: string): Promise<RecipeItem[]> {
    const q = query(
        collection(db, RECIPES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecipeItem));
}

// Creation Flow
export async function createRecipeFromInterview(
    userId: string,
    categoryType: string,
    categoryEmoji: string,
    rawTranscript: string,
    audioBlob: Blob | null,
    duration: number
): Promise<RecipeItem> {
    // 1. Initial Save
    const recipeId = await saveRecipe(userId, {
        type: ['cocina', 'reposteria'].includes(categoryType) ? 'cocina' : 'habilidad',
        category: categoryType,
        categoryEmoji,
        rawTranscript,
        title: 'Procesando...',
        duration,
        items: [],
        steps: []
    });

    // 2. Audio
    let audioUrl;
    if (audioBlob) {
        audioUrl = await saveRecipeAudio(userId, recipeId, audioBlob);
        await saveRecipe(userId, { id: recipeId, audioUrl });
    }

    // 3. Process
    const processed = await processRecipeWithGemini(rawTranscript, categoryType);

    // 4. Generate AI Narration
    console.log('🗣️ Generating Recipe Narration...');
    let narratedAudioUrl;
    try {
        const ingredientsText = processed.items?.join(', ') || '';
        const stepsText = processed.steps?.join('. ') || '';
        const textToRead = `Receta: ${processed.title}. ${processed.description}. Necesitarás: ${ingredientsText}. Pasos: ${stepsText}. Consejo: ${processed.tips}`;

        narratedAudioUrl = await generateRecipeAudio(userId, textToRead, recipeId);
    } catch (e) {
        console.error("Error generating recipe audio:", e);
    }

    // 5. Update
    await saveRecipe(userId, { id: recipeId, ...processed, narratedAudioUrl });

    return {
        id: recipeId,
        userId,
        type: ['cocina', 'reposteria'].includes(categoryType) ? 'cocina' : 'habilidad',
        category: categoryType,
        categoryEmoji,
        rawTranscript,
        audioUrl,
        narratedAudioUrl,
        duration,
        items: [], // Fallback
        steps: [], // Fallback
        tips: '',
        difficulty: 'medium',
        ...processed
    } as RecipeItem;
}

// Generate TTS Audio for Recipe
export async function generateRecipeAudio(
    userId: string,
    text: string,
    recipeId: string
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

        // 2. Generate Audio (Limit text length if needed, ElevenLabs has limits)
        const safeText = text.slice(0, 5000); // Safety cap
        const audioBlob = await textToSpeech(safeText, voice.elevenLabsVoiceId);
        if (!audioBlob) throw new Error("Failed to generate audio");

        // 3. Upload
        const fileName = `${recipeId}_narrated_${Date.now()}.mp3`;
        const storagePath = `users/${userId}/recipes/narrated/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, audioBlob, {
            contentType: 'audio/mpeg',
            customMetadata: { userId, recipeId, type: 'recipe_narration' }
        });

        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error("Error in generateRecipeAudio:", error);
        return undefined;
    }
}

// Upload Video
export async function saveRecipeVideo(
    userId: string,
    recipeId: string,
    videoFile: File
): Promise<string> {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./firebase');

    const fileName = `${recipeId}_video_${Date.now()}.mp4`; // extension might vary but keeping it simple
    const storagePath = `users/${userId}/recipes/videos/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, videoFile, {
        contentType: videoFile.type,
        customMetadata: { userId, recipeId, type: 'recipe_video' }
    });

    return await getDownloadURL(storageRef);
}
