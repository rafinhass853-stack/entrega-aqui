import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB4JpvdR9d0JuBv3cc1DoLeCkftl1Us57k",
  authDomain: "entregaqui-54665.firebaseapp.com",
  projectId: "entregaqui-54665",
  storageBucket: "entregaqui-54665.firebasestorage.app",
  messagingSenderId: "783720911494",
  appId: "1:783720911494:web:3370db582e835089dab707",
  measurementId: "G-8J5Q01B0E4"
};

// 🔥 Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// 🔐 Auth
export const auth = getAuth(app);

// 🗄 Firestore
export const db = getFirestore(app);

// ⚙️ Cloud Functions (ESSENCIAL para painel admin)
export const functions = getFunctions(app);
