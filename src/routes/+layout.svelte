<script>
    import '$lib/assets/css/app.css';
    import { page } from '$app/state';
    import { setContext } from 'svelte';

    let { children } = $props();

    const titles = { fr: 'Tire sur mon doigt !', en: 'Pull my finger!' };
    const allFartsLabel = { fr: 'Tous les prouts', en: 'All farts' };
    const replayLabel = { fr: 'Rejouer', en: 'Play again' };

    const lang = $derived(page.params.lang || 'fr');
    const homeHref = $derived(lang === 'fr' ? '/' : `/${lang}`);
    const proutboxHref = $derived(`/${lang}/proutbox`);
    const title = $derived(titles[lang] ?? titles.fr);
    const label = $derived(allFartsLabel[lang] ?? allFartsLabel.fr);
    const replay = $derived(replayLabel[lang] ?? replayLabel.fr);
    const room = $derived(page.url.searchParams.get('room'));

    let replayFn = $state(null);
    setContext('nav', { setReplay: (fn) => { replayFn = fn; } });
</script>

<svelte:head>
    <meta property="og:site_name" content="Tire sur mon doigt !" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://tire-sur-mon-doigt.fr/web-app-manifest-512x512.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://tire-sur-mon-doigt.fr/web-app-manifest-512x512.png" />
    <script async="async" data-cfasync="false" src="https://pl28018624.effectivecpmnetwork.com/781deaaa368b7b945bbc2df24b7dee54/invoke.js"></script>
</svelte:head>

<nav id="top-nav">
    <div class="nav-left">
        <a href={proutboxHref} class="nav-link">{label}</a>
        {#if replayFn}
            <button class="nav-link nav-button" onclick={replayFn}>{replay}</button>
        {/if}
    </div>
    {#if room}
        <span id="room-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 11a9 9 0 0 1 9 9"/>
                <path d="M4 4a16 16 0 0 1 16 16"/>
                <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            {room}
        </span>
    {/if}
</nav>

<h1><a href={homeHref} class="raw">{title}</a></h1>

{@render children()}
