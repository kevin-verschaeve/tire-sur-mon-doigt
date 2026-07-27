import { db } from '$lib/firebase.js';
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';

// Un visiteur qui n'a pas rafraîchi sa présence depuis ce délai est considéré parti.
const STALE_MS = 90_000;

export async function POST({ params, request }) {
    const { id } = params;
    const { deviceId } = await request.json();

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) {
        return new Response('Invalid deviceId', { status: 400 });
    }

    await setDoc(doc(db, 'rooms', id, 'visitors', deviceId), {
        lastSeen: serverTimestamp()
    });

    // Purge les visiteurs fantômes (onglets fermés brutalement sans envoyer leave).
    reapStale(id).catch(() => {});

    return new Response(null, { status: 201 });
}

async function reapStale(id) {
    const cutoff = Timestamp.fromMillis(Date.now() - STALE_MS);
    const stale = await getDocs(
        query(collection(db, 'rooms', id, 'visitors'), where('lastSeen', '<', cutoff))
    );
    await Promise.all(stale.docs.map((d) => deleteDoc(d.ref)));
}
