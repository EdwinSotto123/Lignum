// Future Messages Service - Raw Audio Storage
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

const FUTURE_MESSAGES_COLLECTION = 'future_messages';

export type RecipientType = 'hijo' | 'pareja' | 'padres' | 'nietos' | 'amigo' | 'otro';

export interface FutureMessage {
    id?: string;
    userId: string;
    recipientType: RecipientType;
    recipientName: string; // Optional specific name (e.g., "Juanito")
    title: string; // e.g., "Para cuando te cases", "Consejo para tu primer trabajo"
    audioUrl: string;
    duration: number;
    playDate?: string; // Optional: "Do not open until..." (ISO date)
    createdAt?: Timestamp;
    isLocked?: boolean; // Visual indicator for "time capsule"
}

// 1. Save Audio File
export async function saveFutureMessageAudio(
    userId: string,
    messageId: string,
    audioBlob: Blob
): Promise<string> {
    const fileName = `${messageId}_${Date.now()}.webm`;
    const storagePath = `users/${userId}/future_messages/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: { userId, messageId, type: 'future_message' }
    });

    return await getDownloadURL(storageRef);
}

// 2. Save Message Metadata
export async function saveFutureMessage(
    userId: string,
    messageData: Partial<FutureMessage>
): Promise<string> {
    const messageRef = messageData.id
        ? doc(db, FUTURE_MESSAGES_COLLECTION, messageData.id)
        : doc(collection(db, FUTURE_MESSAGES_COLLECTION));

    const data = {
        ...messageData,
        userId,
        updatedAt: serverTimestamp()
    };

    if (!messageData.id) {
        (data as any).createdAt = serverTimestamp();
    }

    await setDoc(messageRef, data, { merge: true });
    return messageRef.id;
}

// 3. Get Messages
export async function getUserFutureMessages(userId: string): Promise<FutureMessage[]> {
    const q = query(
        collection(db, FUTURE_MESSAGES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FutureMessage));
}

// 4. Delete Message
export async function deleteFutureMessage(messageId: string): Promise<void> {
    await deleteDoc(doc(db, FUTURE_MESSAGES_COLLECTION, messageId));
}

// 5. Creation Flow (Orchestrator)
export async function createFutureMessage(
    userId: string,
    recipientType: RecipientType,
    recipientName: string,
    title: string,
    audioBlob: Blob,
    duration: number,
    playDate?: string
): Promise<FutureMessage> {
    // A. Generate ID
    const messageRef = doc(collection(db, FUTURE_MESSAGES_COLLECTION));
    const messageId = messageRef.id;

    // B. Upload Audio
    const audioUrl = await saveFutureMessageAudio(userId, messageId, audioBlob);

    // C. Save Metadata
    const newMessage: FutureMessage = {
        id: messageId,
        userId,
        recipientType,
        recipientName,
        title,
        audioUrl,
        duration,
        isLocked: !!playDate,
        createdAt: serverTimestamp() as any,
        ...(playDate ? { playDate } : {})
    };

    await saveFutureMessage(userId, newMessage);

    return newMessage;
}
