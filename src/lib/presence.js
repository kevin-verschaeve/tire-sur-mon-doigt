import { db } from '$lib/firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';

const DEVICE_KEY = 'tsmd.device';
const HEARTBEAT_MS = 20_000;
const STALE_MS = 60_000;

// Identité stable par navigateur/appareil (partagée entre tous les onglets).
function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
}

const tabsKey = (room) => `tsmd.room.${room}.tabs`;

function readTabs(room) {
    try {
        return JSON.parse(localStorage.getItem(tabsKey(room))) || {};
    } catch {
        return {};
    }
}

// Retire les onglets qui n'ont plus donné signe de vie (onglet crashé).
function pruneTabs(tabs, now) {
    const alive = {};
    for (const [id, seenAt] of Object.entries(tabs)) {
        if (now - seenAt < STALE_MS) alive[id] = seenAt;
    }
    return alive;
}

function post(room, path, useBeacon, body) {
    const url = `/api/room/${room}/${path}`;
    const payload = JSON.stringify(body);
    if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        return;
    }
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
    });
}

/**
 * Marque l'appareil comme présent dans un salon et maintient le compteur à jour.
 * Le doc visiteur est partagé par tous les onglets du même appareil : on ne quitte
 * réellement le salon que lorsque le dernier onglet se ferme.
 *
 * @param {string} room
 * @param {(count: number) => void} onCount
 * @returns {() => void} fonction de nettoyage
 */
export function joinRoom(room, onCount) {
    const deviceId = getDeviceId();
    const tabId = crypto.randomUUID();

    // Ajoute cet onglet au registre partagé de l'appareil pour ce salon.
    const register = () => {
        const now = Date.now();
        const tabs = pruneTabs(readTabs(room), now);
        tabs[tabId] = now;
        localStorage.setItem(tabsKey(room), JSON.stringify(tabs));
    };

    let active = false;
    let heartbeat = null;

    const start = () => {
        if (active) return;
        active = true;
        register();
        post(room, 'join', false, { deviceId });
        heartbeat = setInterval(() => {
            register();
            post(room, 'join', false, { deviceId });
        }, HEARTBEAT_MS);
    };

    const stop = (useBeacon) => {
        if (!active) return;
        active = false;
        clearInterval(heartbeat);
        heartbeat = null;

        const tabs = pruneTabs(readTabs(room), Date.now());
        delete tabs[tabId];
        localStorage.setItem(tabsKey(room), JSON.stringify(tabs));

        // On ne supprime le visiteur que si plus aucun onglet de cet appareil n'est ouvert.
        if (Object.keys(tabs).length === 0) {
            post(room, 'leave', useBeacon, { deviceId });
        }
    };

    const unsubscribe = onSnapshot(collection(db, 'rooms', room, 'visitors'), (snap) => {
        onCount(snap.size);
    });

    // Fermeture d'onglet / navigation hors du site. pagehide couvre les mobiles.
    const onPageHide = () => stop(true);
    // Restauration depuis le bfcache : on ré-annonce la présence.
    const onPageShow = (event) => {
        if (event.persisted) start();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    start();

    return () => {
        unsubscribe();
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('beforeunload', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
        stop(false);
    };
}
