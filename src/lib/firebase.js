import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDl9YG73khTZixS0q-l2VD8aRslIx4qUZU",
  authDomain: "tire-sur-mon-doigt.firebaseapp.com",
  projectId: "tire-sur-mon-doigt",
  storageBucket: "tire-sur-mon-doigt.firebasestorage.app",
  messagingSenderId: "32s8540580008",
  appId: "1:328540580008:web:825769bb2187bfd37cfa9d",
  measurementId: "G-1K5BQ80QLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
