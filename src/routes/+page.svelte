<script>
    import '$lib/assets/css/app.css'
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
</script>

<h1>Tire sur mon doigt !</h1>
<h2>On a tiré {counter} fois sur mon doigt !</h2>

<div
    id="doigt"
    use:draggable={{
        axis: 'x',
        bounds: 'body',
        position,
        onDragEnd: async ({ currentNode }) => {
            position = initialPosition
            currentNode.style.translate = 'none'
            document.body.classList.remove('release');
            // updateDoc(docRef, {value: increment(1)})

            const url = await getDownloadURL(ref(storage, fart.fullPath))
            audio.src = url;
            audio.play();

            nextFart()
        },
        onDrag: ({offsetX, currentNode}) => {
            if (currentNode.getBoundingClientRect().width + offsetX >= window.innerWidth - 50) {
                document.body.classList.add('release');
            }
        }
    }}
>
</div>

{#if mobileBackdrop}
    <div id="mobile-backdrop" onclick={() => mobileBackdrop = false}>
        <p id="mobile-hint">Cliquer pour déverouiller</p>
    </div>
{/if}
