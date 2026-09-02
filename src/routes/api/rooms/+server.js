import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase.js';
import { collectionGroup, getDocs } from 'firebase/firestore';

export async function GET() {
    const snapshot = await getDocs(collectionGroup(db, 'visitors'));

    const counts = new Map();
    for (const docSnap of snapshot.docs) {
        // docSnap.ref.path === "rooms/{room}/visitors/{deviceId}"
        const room = docSnap.ref.parent.parent?.id;
        if (!room) continue;
        counts.set(room, (counts.get(room) || 0) + 1);
    }

    const rooms = [...counts.entries()]
        .map(([room, count]) => ({ room, count }))
        .sort((a, b) => b.count - a.count || a.room.localeCompare(b.room));

    return json(rooms);
}
