// Story Service - Firestore storage and Gemini processing
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

const STORIES_COLLECTION = 'stories';

// Story interface
export interface Story {
    id?: string;
    userId: string;
    category: string;
    categoryEmoji: string;
    title: string;
    rawTranscript: string; // Original narration from user
    organizedStory: string; // Processed by Gemini
    audioUrl?: string; // Firebase Storage URL (Original Interview)
    narratedAudioUrl?: string; // AI Cloned Voice Audio URL
    duration?: number; // Recording length in seconds
    summary?: string; // Brief user provided summary
    targetAudience?: 'general' | 'children';
    characterImageOption?: 'upload' | 'ai';
    characterImageUrl?: string; // Uploaded or AI generated
    characters?: Array<{
        name: string;
        description: string;
        visualPrompt: string;
    }>;
    scenes?: Array<{
        sceneNumber: number;
        description: string;
        narrationText: string;
        charactersInScene: string[];
        visualPrompt: string;
    }>;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Save story audio to Firebase Storage
export async function saveStoryAudio(
    userId: string,
    storyId: string,
    audioBlob: Blob
): Promise<string> {
    const fileName = `${storyId}_${Date.now()}.webm`;
    const storagePath = `users/${userId}/stories/${fileName}`;
    const storageRef = ref(storage, storagePath);

    console.log('📤 Uploading story audio to:', storagePath);

    await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: {
            userId,
            storyId,
            uploadedAt: new Date().toISOString()
        }
    });

    const downloadUrl = await getDownloadURL(storageRef);
    console.log('✅ Story audio uploaded:', downloadUrl);

    return downloadUrl;
}

// Upload scene image to Firebase Storage (from base64)
export async function uploadSceneImage(
    userId: string,
    storyId: string,
    base64Image: string,
    sceneIndex: number
): Promise<string> {
    // Convert base64 to blob
    const base64Data = base64Image.split(',')[1] || base64Image;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const fileName = `${storyId}_scene_${sceneIndex}_${Date.now()}.png`;
    const storagePath = `users/${userId}/stories/images/${fileName}`;
    const storageRef = ref(storage, storagePath);

    console.log('📤 Uploading scene image to:', storagePath);

    await uploadBytes(storageRef, blob, {
        contentType: 'image/png',
        customMetadata: {
            userId,
            storyId,
            sceneIndex: String(sceneIndex),
            uploadedAt: new Date().toISOString()
        }
    });

    const downloadUrl = await getDownloadURL(storageRef);
    console.log('✅ Scene image uploaded:', downloadUrl);

    return downloadUrl;
}

// Process story transcript with Gemini to organize it
// Uses Vercel API route for protected keys
export async function processStoryWithGemini(
    rawTranscript: string,
    category: string,
    retryCount = 0
): Promise<{ title: string; organizedStory: string; characters?: any[]; scenes?: any[] }> {
    const maxRetries = 3;
    const baseDelay = 2000;

    try {
        console.log(`🧠 Processing story (attempt ${retryCount + 1}/${maxRetries + 1})...`);

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: rawTranscript, category })
        });

        // Handle rate limit (429) with retry
        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.warn(`⚠️ Rate limited (429). Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return processStoryWithGemini(rawTranscript, category, retryCount + 1);
            } else {
                console.error('❌ Max retries reached for rate limit');
                return { title: `Historia de ${category}`, organizedStory: rawTranscript };
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error processing story: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Story processed successfully');

        return {
            title: data.title || `Historia de ${category}`,
            organizedStory: data.organizedStory || rawTranscript,
            characters: data.characters || [],
            scenes: data.scenes || []
        };

    } catch (error) {
        console.error('Error processing story with Gemini:', error);
        return { title: `Historia de ${category}`, organizedStory: rawTranscript };
    }
}

// Save story to Firestore
export async function saveStory(
    userId: string,
    storyData: Partial<Story>
): Promise<string> {
    console.log('📝 Saving story to Firestore...');

    const storyRef = storyData.id
        ? doc(db, STORIES_COLLECTION, storyData.id)
        : doc(collection(db, STORIES_COLLECTION));

    const storyDoc: Partial<Story> = {
        ...storyData,
        userId,
        updatedAt: serverTimestamp() as Timestamp
    };

    if (!storyData.id) {
        storyDoc.createdAt = serverTimestamp() as Timestamp;
    }

    await setDoc(storyRef, storyDoc, { merge: true });

    console.log('✅ Story saved with ID:', storyRef.id);
    return storyRef.id;
}

// Get user's stories
export async function getUserStories(userId: string): Promise<Story[]> {
    try {
        const storiesQuery = query(
            collection(db, STORIES_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(storiesQuery);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Story[];
    } catch (error) {
        console.error('Error getting stories:', error);
        return [];
    }
}

// Delete a story
export async function deleteStory(storyId: string): Promise<void> {
    await deleteDoc(doc(db, STORIES_COLLECTION, storyId));
    console.log('🗑️ Story deleted:', storyId);
}

// Full story creation flow
export async function createStoryFromInterview(
    userId: string,
    category: string,
    categoryEmoji: string,
    rawTranscript: string,
    audioBlob: Blob | null,
    duration: number,
    metadata?: {
        summary: string;
        targetAudience: 'general' | 'children';
        characterImageOption: 'upload' | 'ai';
        characterFile?: File;
    }
): Promise<Story> {
    console.log('🎬 Starting story creation flow...');

    // Step 0: Upload character image if present
    let characterImageUrl;
    if (metadata?.characterImageOption === 'upload' && metadata.characterFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const fileName = `character_${Date.now()}_${metadata.characterFile.name}`;
        const storageRef = ref(storage, `users/${userId}/stories/images/${fileName}`);
        await uploadBytes(storageRef, metadata.characterFile);
        characterImageUrl = await getDownloadURL(storageRef);
    }
    // TODO: If 'ai', we would trigger image generation here or later

    // Step 1: Create initial story record
    const storyId = await saveStory(userId, {
        category,
        categoryEmoji,
        rawTranscript,
        organizedStory: '', // Will be filled after processing
        title: 'Procesando...',
        duration,
        summary: metadata?.summary,
        targetAudience: metadata?.targetAudience,
        characterImageOption: metadata?.characterImageOption,
        characterImageUrl
    });

    // Step 2: Upload audio if available
    let audioUrl: string | undefined;
    if (audioBlob) {
        try {
            audioUrl = await saveStoryAudio(userId, storyId, audioBlob);
            await saveStory(userId, { id: storyId, audioUrl });
        } catch (error) {
            console.error('Error uploading audio:', error);
        }
    }

    // Step 3: Process transcript with Gemini
    console.log('🧠 Processing story with Gemini...');
    const { title, organizedStory, characters, scenes } = await processStoryWithGemini(rawTranscript, category);

    // Step 4: Generate Audio Narration with Voice Clone
    console.log('🗣️ Generating AI Narration...');
    let narratedAudioUrl: string | undefined;

    try {
        // Construct full text from scenes if available, else use organizedStory
        const fullNarrationText = scenes && scenes.length > 0
            ? scenes.map((s: any) => s.narrationText).join(' ')
            : organizedStory;

        narratedAudioUrl = await generateStoryAudio(userId, fullNarrationText, storyId);
    } catch (e) {
        console.error("Error creating AI narration:", e);
    }

    // Step 5: Update story with processed content and narration
    await saveStory(userId, {
        id: storyId,
        title,
        organizedStory,
        narratedAudioUrl,
        characters,
        scenes
    });

    console.log('✅ Story creation complete!');

    return {
        id: storyId,
        userId,
        category,
        categoryEmoji,
        title,
        rawTranscript,
        organizedStory,
        audioUrl,
        narratedAudioUrl,
        duration,
        summary: metadata?.summary,
        targetAudience: metadata?.targetAudience,
        characterImageOption: metadata?.characterImageOption,
        characterImageUrl,
        characters,
        scenes
    };
}

// Generate TTS Audio for a story
export async function generateStoryAudio(
    userId: string,
    text: string,
    storyId: string
): Promise<string | undefined> {
    try {
        const { getUserVoiceClones } = await import('./voiceCloneService');
        const { textToSpeech } = await import('./elevenLabsService');
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('./firebase');

        // 1. Get user's voice
        const voices = await getUserVoiceClones(userId);
        const voice = voices.find(v => v.status === 'ready' && v.elevenLabsVoiceId);

        if (!voice || !voice.elevenLabsVoiceId) {
            console.warn('No ready voice clone found for user');
            return undefined;
        }

        // 2. Generate Audio
        console.log(`🗣️ Generating audio with voice: ${voice.name} (${voice.elevenLabsVoiceId})`);
        const audioBlob = await textToSpeech(text, voice.elevenLabsVoiceId);

        if (!audioBlob) {
            throw new Error("Failed to generate audio from ElevenLabs");
        }

        // 3. Upload to Storage
        const fileName = `${storyId}_narrated_${Date.now()}.mp3`;
        const storagePath = `users/${userId}/stories/narrated/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, audioBlob, {
            contentType: 'audio/mpeg',
            customMetadata: { userId, storyId, type: 'story_narration' }
        });

        const url = await getDownloadURL(storageRef);
        console.log('✅ Narration uploaded:', url);
        return url;

    } catch (error) {
        console.error("Error in generateStoryAudio:", error);
        return undefined;
    }
}

export default {
    saveStory,
    getUserStories,
    deleteStory,
    createStoryFromInterview,
    processStoryWithGemini,
    saveStoryAudio
};
