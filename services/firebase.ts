
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- IMPORTANT: MULTI-USER SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyCL1sX4ZSLDvg0PINXkSGt-Zx2PyjLk0Gw",
  authDomain: "ava-digital-voting.firebaseapp.com",
  projectId: "ava-digital-voting",
  storageBucket: "ava-digital-voting.firebasestorage.app",
  messagingSenderId: "1085689850912",
  appId: "1:1085689850912:web:106b91a23490beb8efa045",
  measurementId: "G-HEXC1TR1EP",
};

// The app checks if you've replaced the placeholder projectId.
export const isFirebaseConfigured = firebaseConfig.projectId !== "your-project-id";

// --- Initialization Logic ---
let dbInstance: Firestore | null = null;
let initializationComplete = false;

const initialize = () => {
    if (initializationComplete) {
        return;
    }

    if (isFirebaseConfigured) {
        try {
            const app: FirebaseApp = getApps().length === 0 
                ? initializeApp(firebaseConfig) 
                : getApp();
            
            dbInstance = getFirestore(app);
            console.log("Firebase initialized successfully. Application is in ONLINE, MULTI-USER mode.");
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            dbInstance = null;
        }
    } else {
        console.warn("Application is running in OFFLINE, SINGLE-USER mode.");
    }
    
    initializationComplete = true;
};

export const getDb = (): Firestore | null => {
    initialize();
    return dbInstance;
};
