import { redirect, isRedirect } from '@sveltejs/kit';
import { db } from '$lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export async function load() {
    try {
        const snapshot = await getDoc(doc(db, 'data', 'qrcode'));
        const data = snapshot.exists() ? snapshot.data() : {};
        const room = data?.room;
        const lang = data?.lang;
        const base = lang ? `/${lang}/` : '/';
        redirect(302, room ? `${base}?room=${encodeURIComponent(room)}` : base);
    } catch (e) {
        if (isRedirect(e)) throw e;
        redirect(302, '/');
    }
}
