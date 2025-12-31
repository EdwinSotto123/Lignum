// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDq3pquwVIPJl8wfBFdOYafwx2XjrkFTM0",
    authDomain: "simplia-465814.firebaseapp.com",
    projectId: "simplia-465814",
    storageBucket: "simplia-465814.firebasestorage.app",
    messagingSenderId: "774153398859",
    appId: "1:774153398859:web:81498e5d3e9d12aaaa7bce",
    measurementId: "G-GJ31YLFDS4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
export const initAnalytics = async () => {
    if (await isSupported()) {
        return getAnalytics(app);
    }
    return null;
};

export default app;
