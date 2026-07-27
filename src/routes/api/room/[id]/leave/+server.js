import { db } from '$lib/firebase.js';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST({ params, request }) {
    const { id } = params;

    let deviceId;
    try {
        ({ deviceId } = await request.json());
    } catch {
        return new Response('Invalid body', { status: 400 });
    }

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) {
        return new Response('Invalid deviceId', { status: 400 });
    }

    await deleteDoc(doc(db, 'rooms', id, 'visitors', deviceId));

    return new Response(null, { status: 204 });
}
