// Voice Cloning Service with Firebase Storage and Firestore
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { storage, db } from "./firebase";

// Types
export interface VoiceClone {
    id: string;
    userId: string;
    name: string;
    description: string;
    elevenLabsVoiceId: string | null;
    audioSamples: AudioSample[];
    status: 'pending' | 'processing' | 'ready' | 'failed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AudioSample {
    id: string;
    fileName: string;
    storageUrl: string;
    duration: number;
    uploadedAt: Timestamp;
}

// Collections
const VOICES_COLLECTION = 'voices';
const AUDIO_SAMPLES_COLLECTION = 'audioSamples';

/**
 * Upload audio sample to Firebase Storage
 */
export const uploadAudioSample = async (
    userId: string,
    audioBlob: Blob,
    fileName: string
): Promise<{ storageUrl: string; storagePath: string }> => {
    try {
        // Create unique path: users/{userId}/audio/{timestamp}_{fileName}
        const timestamp = Date.now();
        const storagePath = `users/${userId}/audio/${timestamp}_${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload the blob
        await uploadBytes(storageRef, audioBlob, {
            contentType: 'audio/webm',
        });

        // Get download URL
        const storageUrl = await getDownloadURL(storageRef);

        return { storageUrl, storagePath };
    } catch (error: any) {
        console.error('Error uploading audio:', error);
        throw new Error('Error al subir el audio. Intenta de nuevo.');
    }
};

/**
 * Create or update voice clone record in Firestore
 */
export const saveVoiceClone = async (
    userId: string,
    voiceData: Partial<VoiceClone>
): Promise<string> => {
    console.log('📝 saveVoiceClone called with userId:', userId);

    try {
        const voiceRef = voiceData.id
            ? doc(db, VOICES_COLLECTION, voiceData.id)
            : doc(collection(db, VOICES_COLLECTION));

        console.log('📝 Creating doc reference, ID will be:', voiceRef.id);

        const voiceDoc: Partial<VoiceClone> = {
            ...voiceData,
            userId,
            updatedAt: serverTimestamp() as Timestamp,
        };

        if (!voiceData.id) {
            voiceDoc.createdAt = serverTimestamp() as Timestamp;
            voiceDoc.status = 'pending';
        }

        console.log('📝 About to call setDoc...');

        // Add timeout to detect hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('⏰ Timeout: Firestore no responde. Verifica las reglas.')), 15000);
        });

        await Promise.race([
            setDoc(voiceRef, voiceDoc, { merge: true }),
            timeoutPromise
        ]);

        console.log('✅ setDoc completed! ID:', voiceRef.id);
        return voiceRef.id;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw new Error(error.message || 'Error al guardar.');
    }
};

/**
 * Get user's voice clones
 */
export const getUserVoiceClones = async (userId: string): Promise<VoiceClone[]> => {
    try {
        const voicesQuery = query(
            collection(db, VOICES_COLLECTION),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(voicesQuery);
        const voices: VoiceClone[] = [];

        snapshot.forEach((doc) => {
            voices.push({ id: doc.id, ...doc.data() } as VoiceClone);
        });

        return voices;
    } catch (error: any) {
        console.error('Error getting voice clones:', error);
        throw new Error('Error al obtener las voces.');
    }
};

/**
 * Get a specific voice clone
 */
export const getVoiceClone = async (voiceId: string): Promise<VoiceClone | null> => {
    try {
        const voiceRef = doc(db, VOICES_COLLECTION, voiceId);
        const voiceDoc = await getDoc(voiceRef);

        if (!voiceDoc.exists()) {
            return null;
        }

        return { id: voiceDoc.id, ...voiceDoc.data() } as VoiceClone;
    } catch (error: any) {
        console.error('Error getting voice clone:', error);
        throw new Error('Error al obtener la voz.');
    }
};

/**
 * Update voice clone with ElevenLabs voice ID after successful cloning
 */
export const updateVoiceWithElevenLabsId = async (
    voiceId: string,
    elevenLabsVoiceId: string
): Promise<void> => {
    try {
        const voiceRef = doc(db, VOICES_COLLECTION, voiceId);

        await setDoc(voiceRef, {
            elevenLabsVoiceId,
            status: 'ready',
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error: any) {
        console.error('Error updating voice with ElevenLabs ID:', error);
        throw new Error('Error al actualizar la voz.');
    }
};

/**
 * Mark voice clone as failed
 */
export const markVoiceAsFailed = async (
    voiceId: string,
    errorMessage: string
): Promise<void> => {
    try {
        const voiceRef = doc(db, VOICES_COLLECTION, voiceId);

        await setDoc(voiceRef, {
            status: 'failed',
            errorMessage,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error: any) {
        console.error('Error marking voice as failed:', error);
    }
};

/**
 * Add audio sample to voice clone
 */
export const addAudioSampleToVoice = async (
    voiceId: string,
    audioSample: Omit<AudioSample, 'id' | 'uploadedAt'>
): Promise<void> => {
    try {
        const voiceRef = doc(db, VOICES_COLLECTION, voiceId);
        const voiceDoc = await getDoc(voiceRef);

        if (!voiceDoc.exists()) {
            throw new Error('Voice not found');
        }

        const currentSamples = voiceDoc.data().audioSamples || [];
        const newSample: AudioSample = {
            ...audioSample,
            id: `sample_${Date.now()}`,
            uploadedAt: serverTimestamp() as Timestamp,
        };

        await setDoc(voiceRef, {
            audioSamples: [...currentSamples, newSample],
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error: any) {
        console.error('Error adding audio sample:', error);
        throw new Error('Error al agregar la muestra de audio.');
    }
};

/**
 * Full flow: Upload audio and save to voice clone
 */
export const uploadAndSaveAudioSample = async (
    userId: string,
    voiceId: string,
    audioBlob: Blob,
    fileName: string,
    duration: number
): Promise<void> => {
    // 1. Upload to storage
    const { storageUrl } = await uploadAudioSample(userId, audioBlob, fileName);

    // 2. Add to voice clone document
    await addAudioSampleToVoice(voiceId, {
        fileName,
        storageUrl,
        duration,
    });
};
