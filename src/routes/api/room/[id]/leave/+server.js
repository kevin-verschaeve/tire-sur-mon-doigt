import { db } from '$lib/firebase.js';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST({ params, request }) {
    const { id } = params;

    let sessionId;
    try {
        ({ sessionId } = await request.json());
    } catch {
        return new Response('Invalid body', { status: 400 });
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
        return new Response('Invalid sessionId', { status: 400 });
    }

    await deleteDoc(doc(db, 'rooms', id, 'visitors', sessionId));

    return new Response(null, { status: 204 });
}
