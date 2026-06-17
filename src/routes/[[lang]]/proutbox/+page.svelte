<script>
    import { onMount, getContext } from 'svelte';
    import { storage } from '$lib/firebase.js'
    import { ref, listAll, getDownloadURL } from 'firebase/storage'

    const nav = getContext('nav');

    let { data } = $props();
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
        nav.onFartPlayed();
    }

    const t = {
        fr: {
            fart: 'Prout',
            meta: {
                title: 'La Proutbox – Tous les prouts | Tire sur mon doigt !',
                description: 'Écoute et rejoue tous les prouts de la collection. Des sons de pets à volonté !',
                canonical: 'https://tire-sur-mon-doigt.fr/proutbox',
                url: 'https://tire-sur-mon-doigt.fr/proutbox',
            },
        },
        en: {
            fart: 'Fart',
            meta: {
                title: 'The Fart Box – All the farts | Pull my finger!',
                description: 'Listen and replay all the farts in the collection. Fart sounds on demand!',
                canonical: 'https://tire-sur-mon-doigt.fr/en/proutbox',
                url: 'https://tire-sur-mon-doigt.fr/en/proutbox',
            },
        },
    }[data.lang];
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


<div class="content">
    {#each farts as fart, i}
        <button onclick={() => playFart(fart)} class="button-fart">
            {t.fart} {i + 1}
        </button>
    {/each}
</div>
