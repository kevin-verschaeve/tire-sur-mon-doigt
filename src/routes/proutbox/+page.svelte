<script>
    import { onMount } from 'svelte';
    import { storage } from '$lib/firebase.js'
    import { ref, listAll, getDownloadURL } from 'firebase/storage'

    let farts = $state(null);
    let audio = $state(null);

    onMount(async () => {
        audio = new Audio();
        farts = (await listAll(ref(storage))).items.sort();
    });

    const playFart = async (f) => {
        const url = await getDownloadURL(ref(storage, f.fullPath));
        audio.src = url;
        audio.play();
    }
</script>

<div id="farts-wrapper">
    {#each farts as fart, i}
        <button onclick={() => playFart(fart)} class="button-fart">
            Prout {i + 1}
        </button>
    {/each}
</div>
