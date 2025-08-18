import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Updated Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCskD4PDaQyk4kKEZhrbDZwDEZa7qqosow",
  authDomain: "nexfarmauth.firebaseapp.com",
  projectId: "nexfarmauth",
  storageBucket: "nexfarmauth.firebasestorage.app",
  messagingSenderId: "1061341752280",
  appId: "1:1061341752280:web:de2b171029c37fdbdd20ad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Google Sign-In function
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};