import { db } from '$lib/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST({ params, request }) {
    const { id } = params;
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
        return new Response('Invalid sessionId', { status: 400 });
    }

    await setDoc(doc(db, 'rooms', id, 'visitors', sessionId), {
        joinedAt: serverTimestamp()
    });

    return new Response(null, { status: 201 });
}
