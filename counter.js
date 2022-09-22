import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.5.0/firebase-app.js'    
import { doc, onSnapshot, updateDoc, increment, getFirestore } from 'https://www.gstatic.com/firebasejs/9.5.0/firebase-firestore.js'
import { getStorage, ref, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.5.0/firebase-storage.js'

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
const storage = getStorage(app);

let audio;
let farts;
let fart;

const nextFart = () => {
    const previous = fart;
    fart = farts.items.sort(() => 0.5 - Math.random())[0]
    if (fart === previous) {
        nextFart()
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    audio = new Audio();
    farts = await listAll(ref(storage))
    nextFart()
}, false);

onSnapshot(docRef, (data) => document.getElementById('counter').innerText = data.data().counter);
document.addEventListener('release', async () => {
    const url = await getDownloadURL(ref(storage, fart.fullPath))
    audio.src = url;
    audio.play();
    updateDoc(docRef, {counter: increment(1)})
    nextFart()
});
