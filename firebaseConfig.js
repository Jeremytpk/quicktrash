//firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJJ02DW6WSpnAr04PWRLh243VGBtUaGvY",
  authDomain: "quicktrash-1cdff.firebaseapp.com",
  projectId: "quicktrash-1cdff",
  storageBucket: "quicktrash-1cdff.firebasestorage.app",
  messagingSenderId: "255447451336",
  appId: "1:255447451336:web:8a6025a6e63b0ddac2c7fd",
  measurementId: "G-T7WD3D3EZ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the auth, db, and storage objects for use in other components
export { auth, db, storage };
