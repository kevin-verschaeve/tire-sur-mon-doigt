<script>
    import '$lib/assets/css/app.css';
    import { page } from '$app/state';

    let { children } = $props();

    const titles = {
        fr: 'Tire sur mon doigt !',
        en: 'Pull my finger!',
    };

    const lang = $derived(page.params.lang || 'fr');
    const title = $derived(titles[lang] ?? titles.fr);
    const homeHref = $derived(lang === 'fr' ? '/' : `/${lang}`);
</script>

<svelte:head>
    <meta property="og:site_name" content="Tire sur mon doigt !" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://tire-sur-mon-doigt.fr/web-app-manifest-512x512.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://tire-sur-mon-doigt.fr/web-app-manifest-512x512.png" />
</svelte:head>

<h1>
    <a href={homeHref} class="raw">{title}</a>
</h1>

{@render children()}
