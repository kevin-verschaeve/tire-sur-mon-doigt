<script>
    import doigt from '$lib/assets/images/doigt.png'
    import { draggable } from '@neodrag/svelte';
    import { db, storage } from '$lib/firebase.js'
    import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { ref, listAll, getDownloadURL } from 'firebase/storage'

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

<h2>On a tiré {counter} fois sur mon doigt !</h2>

<div id="play-again-wrapper">
    {#if lastPlayedFart}
        <button id="play-again-button" onclick={() => playFart(lastPlayedFart)}>
            Rejouer le prout
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

<div id="to-box">
    <a href="/proutbox" class="wide button-fart">&#x27A2; Tous les prouts</a>
</div>

{#if mobileBackdrop}
    <div id="mobile-backdrop" onclick={() => mobileBackdrop = false}>
        <p id="mobile-hint">Cliquer pour déverouiller</p>
    </div>
{/if}
