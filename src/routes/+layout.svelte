<script>
    import '$lib/assets/css/app.css';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { afterNavigate } from '$app/navigation';

    let { children } = $props();

    const titles = {
        fr: 'Tire sur mon doigt !',
        en: 'Pull my finger!',
    };

    const lang = $derived(page.params.lang || 'fr');
    const title = $derived(titles[lang] ?? titles.fr);
    const homeHref = $derived(lang === 'fr' ? '/' : `/${lang}`);

    const consentText = {
        fr: {
            text: 'Ce site utilise Google Analytics pour mesurer son audience.',
            accept: 'Accepter',
            decline: 'Refuser',
        },
        en: {
            text: 'This site uses Google Analytics to measure traffic.',
            accept: 'Accept',
            decline: 'Decline',
        },
    };

    let showConsent = $state(false);
    let gaLoaded = false;

    function loadGA() {
        if (gaLoaded) return;
        gaLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', 'G-1K5BQ80QLG');
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-1K5BQ80QLG';
        document.head.appendChild(script);
    }

    function accept() {
        localStorage.setItem('cookieConsent', 'accepted');
        showConsent = false;
        loadGA();
    }

    function decline() {
        localStorage.setItem('cookieConsent', 'declined');
        showConsent = false;
    }

    onMount(() => {
        const stored = localStorage.getItem('cookieConsent');
        if (!stored) {
            showConsent = true;
        } else if (stored === 'accepted') {
            loadGA();
        }
    });

    afterNavigate(() => {
        if (window.gtag) {
            window.gtag('event', 'page_view', { page_path: window.location.pathname });
        }
    });
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

{#if showConsent}
    <div id="mobile-backdrop">
        <div id="consent-box">
            <p id="mobile-hint">{consentText[lang].text}</p>
            <div id="consent-buttons">
                <button class="button-fart" onclick={accept}>{consentText[lang].accept}</button>
                <button class="button-fart" onclick={decline}>{consentText[lang].decline}</button>
            </div>
        </div>
    </div>
{/if}
