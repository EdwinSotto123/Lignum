// Firebase Authentication Service
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

// Sign up with email and password
export const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
): Promise<AuthUser> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name
        await updateProfile(user, { displayName });

        return {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            photoURL: user.photoURL
        };
    } catch (error: any) {
        throw new Error(getErrorMessage(error.code));
    }
};

// Sign in with email and password
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<AuthUser> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        };
    } catch (error: any) {
        throw new Error(getErrorMessage(error.code));
    }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<AuthUser> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        };
    } catch (error: any) {
        throw new Error(getErrorMessage(error.code));
    }
};

// Sign out
export const logOut = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error: any) {
        throw new Error(getErrorMessage(error.code));
    }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        throw new Error(getErrorMessage(error.code));
    }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
            callback({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            });
        } else {
            callback(null);
        }
    });
};

// Get current user
export const getCurrentUser = (): AuthUser | null => {
    const user = auth.currentUser;
    if (user) {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        };
    }
    return null;
};

// Error messages in Spanish
const getErrorMessage = (code: string): string => {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'Este correo ya está registrado. Intenta iniciar sesión.';
        case 'auth/invalid-email':
            return 'El correo electrónico no es válido.';
        case 'auth/operation-not-allowed':
            return 'Esta operación no está permitida.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/user-disabled':
            return 'Esta cuenta ha sido deshabilitada.';
        case 'auth/user-not-found':
            return 'No existe una cuenta con este correo.';
        case 'auth/wrong-password':
            return 'La contraseña es incorrecta.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos. Intenta más tarde.';
        case 'auth/popup-closed-by-user':
            return 'Cerraste la ventana de inicio de sesión.';
        case 'auth/cancelled-popup-request':
            return 'Operación cancelada.';
        default:
            return 'Ocurrió un error. Intenta de nuevo.';
    }
};
