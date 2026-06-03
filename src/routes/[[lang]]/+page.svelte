<script>
    import doigt from '$lib/assets/images/doigt.png'
    import { draggable } from '@neodrag/svelte';
    import { db, storage } from '$lib/firebase.js'
    import { doc, onSnapshot, updateDoc, increment, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
    import { onMount, getContext } from 'svelte';
    import { ref, listAll, getDownloadURL } from 'firebase/storage'
    import { page } from '$app/state';

    let { data } = $props();

    const t = {
        fr: {
            counter: (n) => `On a tiré ${n} fois sur mon doigt !`,
            replayButton: 'Rejouer',
            mobileHint: 'Cliquer pour déverouiller',
            replayButton: 'Rejouer le prout',
            allFarts: 'Tous les prouts',
            meta: {
                title: 'Tire sur mon doigt !',
                description: 'Tire sur le doigt pour déclencher un prout ! Rejoins des milliers de joueurs et compte les pets.',
                canonical: 'https://tire-sur-mon-doigt.fr/',
                url: 'https://tire-sur-mon-doigt.fr/',
            },
        },
        en: {
            counter: (n) => `My finger has been pulled ${n} times!`,
            replayButton: 'Play again',
            mobileHint: 'Click to unlock',
            replayButton: 'Play the fart again',
            allFarts: 'All the farts',
            meta: {
                title: 'Pull my finger!',
                description: 'Pull the finger to trigger a fart! Join thousands of players and count the toots.',
                canonical: 'https://tire-sur-mon-doigt.fr/en',
                url: 'https://tire-sur-mon-doigt.fr/en',
            },
        },
    }[data.lang];

    let counter = $state(0);
    let audio = $state(null);
    let farts = $state([]);
    let fart = $state(null);
    let lastPlayedFart = $state(null)
    let maxReached = $state(false);
    const localClientId = crypto.randomUUID();
    let isPlaying = $state(false);
    let mobileBackdrop = $state(true);

    const initialPosition = {x: 0, y: 0}
    let position = $state(initialPosition)

    const docRef = doc(db, 'data', 'counter');

    const room = page.url.searchParams.get('room');

    const nav = getContext('nav');

    onMount(async () => {
        farts = await listAll(ref(storage))
        audio = new Audio();
        audio.addEventListener('play', () => isPlaying = true);
        audio.addEventListener('ended', () => isPlaying = false);
        audio.addEventListener('pause', () => isPlaying = false);
        nextFart()
        onSnapshot(docRef, (snapshot) => {
            counter = snapshot.data().value
        });

        if (room) {
            const nowPlayingRef = doc(db, 'nowPlaying', room);
            onSnapshot(nowPlayingRef, async (snapshot) => {
                if (!snapshot.exists()) return;
                const { soundPath, from } = snapshot.data();
                if (from === localClientId) return;
                if (!soundPath) return;
                lastPlayedFart = { fullPath: soundPath };
                playFart(lastPlayedFart);
            });
        }
    });

    const nextFart = () => {
        const previous = fart;
        fart = farts.items.sort(() => 0.5 - Math.random())[0]
        if (fart === previous) {
            nextFart()
        }
    }

    const playFart = async (f) => {
        const url = await getDownloadURL(ref(storage, f.fullPath));
        audio.src = url;
        audio.play().catch(() => {});
        nav.onFartPlayed();
    }

    const triggerFart = async (f) => {
        playFart(f);
        lastPlayedFart = f;
        if (room) {
            const nowPlayingRef = doc(db, 'nowPlaying', room);
            await setDoc(nowPlayingRef, { soundPath: f.fullPath, ts: serverTimestamp(), from: localClientId });
            deleteDoc(nowPlayingRef);
        }
    }
</script>

<svelte:head>
    <title>{t.meta.title}</title>
    <meta name="description" content={t.meta.description} />
    <link rel="canonical" href={t.meta.canonical} />
    <meta property="og:title" content={t.meta.title} />
    <meta property="og:description" content={t.meta.description} />
    <meta property="og:url" content={t.meta.url} />
    <meta name="twitter:title" content={t.meta.title} />
    <meta name="twitter:description" content={t.meta.description} />
</svelte:head>

<h2>
    {t.counter(counter)}
    {#if isPlaying}
        <span class="sound-bars">
            <span></span>
            <span></span>
            <span></span>
        </span>
    {/if}
    {#if lastPlayedFart}
        <button class="replay-btn" title="{t.replayButton}" onclick={() => triggerFart(lastPlayedFart)} aria-label={t.replayButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
    {/if}
</h2>

<div
    id="doigt"
    style="background-image: url({doigt});"
    use:draggable={{
        axis: 'x',
        bounds: 'body',
        position,
        onDragEnd: async ({ currentNode }) => {
            position = initialPosition
            currentNode.style.translate = 'none'
            document.body.classList.remove('release');

            if (!maxReached) {
                return;
            }

            updateDoc(docRef, {value: increment(1)})

            triggerFart(fart);
            nextFart();
        },
        onDrag: ({offsetX, currentNode}) => {
            maxReached = false;
            if (currentNode.getBoundingClientRect().width + offsetX >= window.innerWidth - 50) {
                document.body.classList.add('release');
                maxReached = true;
            }
        }
    }}
>
</div>

{#if mobileBackdrop}
    <div id="mobile-backdrop" onclick={() => mobileBackdrop = false}>
        <p id="mobile-hint">{t.mobileHint}</p>
    </div>
{/if}

<div id="container-781deaaa368b7b945bbc2df24b7dee54" class="ads-native-banner ads-banner-width"></div>
