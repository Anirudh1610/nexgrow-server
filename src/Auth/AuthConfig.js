import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Your Firebase config object (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDJSfxw7tgUBYjawoDxFb6OeLcogkYhf2g",
  authDomain: "nexfarm-client.firebaseapp.com",
  projectId: "nexfarm-client",
  storageBucket: "nexfarm-client.firebasestorage.app",
  messagingSenderId: "376336570455",
  appId: "1:376336570455:web:c0ef318443f0c896896b12",
  measurementId: "G-R0BVNL48FR"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize analytics but don't assign to variable since it's not used
getAnalytics(app);

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