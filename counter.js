import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.5.0/firebase-app.js'    
import { doc, onSnapshot, updateDoc, increment, getFirestore } from 'https://www.gstatic.com/firebasejs/9.5.0/firebase-firestore.js'

const firebaseConfig = {
    apiKey: "AIzaSyBDZfkcgcnFaBHs45qU3nGMSxFnwhFqXDI",
    authDomain: "serial-looser.firebaseapp.com",
    databaseURL: "https://serial-looser.firebaseio.com",
    projectId: "serial-looser",
    storageBucket: "serial-looser.appspot.com",
    messagingSenderId: "855451240542",
    appId: "1:855451240542:web:a7b92b73d820c2f2cb8ccf",
    measurementId: "G-YS0WMGBKX1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, 'tire-sur-mon-doigt', 'data');

onSnapshot(docRef, (data) => document.getElementById('counter').innerText = data.data().counter);

document.addEventListener('release', () => updateDoc(docRef, {counter: increment(1)}));
