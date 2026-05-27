<script>
    import doigt from '$lib/assets/images/doigt.png'
    import { draggable } from '@neodrag/svelte';
    import { db, storage } from '$lib/firebase.js'
    import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { ref, listAll, getDownloadURL } from 'firebase/storage'

    let { data } = $props();

    const t = {
        fr: {
            counter: (n) => `On a tiré ${n} fois sur mon doigt !`,
            replayButton: 'Rejouer le prout',
            allFarts: 'Tous les prouts',
            mobileHint: 'Cliquer pour déverouiller',
            meta: {
                title: 'Tire sur mon doigt !',
                description: 'Tire sur le doigt pour déclencher un prout ! Rejoins des milliers de joueurs et compte les pets.',
                canonical: 'https://tire-sur-mon-doigt.fr/',
                url: 'https://tire-sur-mon-doigt.fr/',
            },
        },
        en: {
            counter: (n) => `My finger has been pulled ${n} times!`,
            replayButton: 'Play the fart again',
            allFarts: 'All the farts',
            mobileHint: 'Click to unlock',
            meta: {
                title: 'Pull my finger!',
                description: 'Pull the finger to trigger a fart! Join thousands of players and count the toots.',
                canonical: 'https://tire-sur-mon-doigt.fr/en',
                url: 'https://tire-sur-mon-doigt.fr/en',
            },
        },
    }[data.lang];

    let counter = $state(0);
    let mobileBackdrop = $state(true)

    let audio = $state(null);
    let farts = $state([]);
    let fart = $state(null);
    let lastPlayedFart = $state(null)
    let maxReached = $state(false);

    const initialPosition = {x: 0, y: 0}
    let position = $state(initialPosition)

    const docRef = doc(db, 'data', 'counter');

    onMount(async () => {
        farts = await listAll(ref(storage))
        audio = new Audio();
        nextFart()
        onSnapshot(docRef, (snapshot) => {
            counter = snapshot.data().value
        });
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
        audio.play();
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

<h2>{t.counter(counter)}</h2>

<div id="to-box">
    <a href="/{data.lang}/proutbox" class="wide button-fart">&#x27A2; {t.allFarts}</a>
    {#if lastPlayedFart}
        <button id="play-again-button" onclick={() => playFart(lastPlayedFart)}>
            {t.replayButton}
        </button>
    {/if}
</div>

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

            playFart(fart);
            lastPlayedFart = fart;
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
