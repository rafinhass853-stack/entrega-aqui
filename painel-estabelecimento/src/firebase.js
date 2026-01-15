import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 1. Adicione esta importação

const firebaseConfig = {
  apiKey: "AIzaSyB4JpvdR9d0JuBv3cc1DoLeCkftl1Us57k",
  authDomain: "entregaqui-54665.firebaseapp.com",
  projectId: "entregaqui-54665",
  storageBucket: "entregaqui-54665.firebasestorage.app",
  messagingSenderId: "783720911494",
  appId: "1:783720911494:web:777a9f9411215010dab707",
  measurementId: "G-B7SL3MSRYW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // 2. Exporte o storage
export default app;