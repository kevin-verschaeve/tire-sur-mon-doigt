<script>
    import '$lib/assets/css/app.css';
    import { page } from '$app/state';
    import { setContext } from 'svelte';
    import { onMount } from 'svelte';
    import { afterNavigate } from '$app/navigation';
    import { db } from '$lib/firebase.js';
    import { collection, onSnapshot } from 'firebase/firestore';

    let { children, data } = $props();

    const homeHref = $derived(data.lang === 'fr' ? '/' : `/${data.lang}`);
    const proutboxHref = $derived(`/${data.lang}/proutbox`)
    const room = $derived(page.url.searchParams.get('room'));

    let replayFn = $state(null);
    let visitorCount = $state(null);

    $effect(() => {
        if (!room) return;

        const sessionKey = `tsmd.session.${room}`;
        let sessionId = sessionStorage.getItem(sessionKey);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(sessionKey, sessionId);
        }

        fetch(`/api/room/${room}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });

        const unsubscribe = onSnapshot(collection(db, 'rooms', room, 'visitors'), (snap) => {
            visitorCount = snap.size;
        });

        let leaveSent = false;
        const sendLeave = () => {
            if (leaveSent) return;
            leaveSent = true;
            sessionStorage.removeItem(sessionKey);
            const blob = new Blob([JSON.stringify({ sessionId })], { type: 'application/json' });
            navigator.sendBeacon(`/api/room/${room}/leave`, blob);
        };

        window.addEventListener('beforeunload', sendLeave);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', sendLeave);
            sendLeave();
        };
    });

    function dismissSoundHint() {
        showSoundHint = false;
        sessionStorage.setItem('tsmd.sound_hint_seen', '1');
    }

    setContext('nav', {
        setReplay: (fn) => { replayFn = fn; },
        onFartPlayed: dismissSoundHint,
    });

    const t = {
        fr: {
            home: 'Accueil',
            title: 'Tire sur mon doigt !',
            allFarts: 'Tous les prouts',
            replay: 'Rejouer',
            bannerText: 'Ce site utilise des cookies.',
            soundHintText: '🔊 Active le son !',
        },
        en: {
            home: 'Home',
            title: 'Pull my finger!',
            allFarts: 'All farts',
            replay: 'Play again',
            bannerText: 'This site uses cookies.',
            soundHintText: '🔊 Turn on your sound!',
        },
    }[data.lang];

    let showBanner = $state(false);
    let showSoundHint = $state(false);
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

    function dismissBanner() {
        localStorage.setItem('tsmd.cookie_consent', 'accepted');
        showBanner = false;
        loadGA();
    }

    onMount(() => {
        const stored = localStorage.getItem('tsmd.cookie_consent');

        if (!stored) {
            showBanner = true;
        } else if (stored === 'accepted') {
            loadGA();
        }

        if (!sessionStorage.getItem('tsmd.sound_hint_seen')) {
            showSoundHint = true;
        }
    });

    afterNavigate(() => {
        if (window.gtag) {
            window.gtag('event', 'page_view', { page_path: window.location.pathname + window.location.search });
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
    <script async="async" data-cfasync="false" src="https://pl28018624.effectivecpmnetwork.com/781deaaa368b7b945bbc2df24b7dee54/invoke.js"></script>
</svelte:head>

<nav id="top-nav">
    <div class="nav-left">
        <a href="/{data.lang}" class="nav-link">{t.home}</a>
        <a href={proutboxHref} class="nav-link">{t.allFarts}</a>
        {#if replayFn}
            <button class="nav-link nav-button" onclick={replayFn}>{t.replay}</button>
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
            {#if visitorCount !== null}
                <span class="room-visitor-count">{visitorCount}</span>
            {/if}
        </span>
    {/if}
</nav>

<h1><a href={homeHref} class="raw">{t.title}</a></h1>

{@render children()}

{#if showSoundHint}
    <div id="sound-hint" role="status">
        <span>{t.soundHintText}</span>
        <button id="sound-hint-close" onclick={dismissSoundHint} aria-label="Fermer">✕</button>
    </div>
{/if}

{#if showBanner}
    <div id="cookie-banner">
        <span>{t.bannerText}</span>
        <button id="cookie-close" onclick={dismissBanner} aria-label="Fermer">✕</button>
    </div>
{/if}
