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

<svelte:head>
    <title>La Proutbox – Tous les prouts | Tire sur mon doigt !</title>
    <meta name="description" content="Écoute et rejoue tous les prouts de la collection. Des sons de pets à volonté !" />
    <link rel="canonical" href="https://tire-sur-mon-doigt.fr/proutbox" />
    <meta property="og:title" content="La Proutbox – Tous les prouts" />
    <meta property="og:description" content="Écoute et rejoue tous les prouts de la collection. Des sons de pets à volonté !" />
    <meta property="og:url" content="https://tire-sur-mon-doigt.fr/proutbox" />
    <meta name="twitter:title" content="La Proutbox – Tous les prouts" />
    <meta name="twitter:description" content="Écoute et rejoue tous les prouts de la collection. Des sons de pets à volonté !" />
</svelte:head>

<div id="farts-wrapper">
    {#each farts as fart, i}
        <button onclick={() => playFart(fart)} class="button-fart">
            Prout {i + 1}
        </button>
    {/each}
</div>
