import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// src/firebase.js (추가)
import { getFirestore } from 'firebase/firestore';

// Firebase 설정 (여기서 'YOUR_API_KEY' 등을 실제 값으로 변경하세요)
const firebaseConfig = {
    apiKey: "AIzaSyDYTYu3KRhrdq2za6onCIiQO04v-2G20Uk",
    authDomain: "posanticket.vercel.app",
    projectId: "posanbab",
    storageBucket: "posanbab.firebasestorage.app",
    messagingSenderId: "275820343995",
    appId: "1:275820343995:web:0b06f7e0e75f50ff5f6f9e",
    measurementId: "G-GEHLPR1EBJ"
  };

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export { auth, googleProvider };

