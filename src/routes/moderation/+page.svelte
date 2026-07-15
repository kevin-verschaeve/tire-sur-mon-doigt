<script>
    import { onMount } from 'svelte';
    import { SvelteSet } from 'svelte/reactivity';
    import { auth, storage } from '$lib/firebase.js'
    import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
    import { ref, listAll, getBlob, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage'


    let authState = $state('loading'); // 'loading' | 'anon' | 'authed'
    let email = $state('');
    let password = $state('');
    let loginError = $state(null);
    let loggingIn = $state(false);

    let sounds = $state(null); // null = chargement, [] = vide
    let audio = $state(null);
    let processing = new SvelteSet();

    onMount(() => {
        audio = new Audio();

        return onAuthStateChanged(auth, (user) => {
            if (user) {
                authState = 'authed';
                loadSounds();
            } else {
                authState = 'anon';
            }
        });
    });

    async function login(e) {
        e.preventDefault();
        loginError = null;
        loggingIn = true;
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            password = '';
        } catch (err) {
            console.error(err);
            loginError = 'Identifiants invalides.';
        } finally {
            loggingIn = false;
        }
    }

    function logout() {
        signOut(auth);
        sounds = null;
    }

    async function loadSounds() {
        sounds = null;
        const res = await listAll(ref(storage, 'moderation'));
        sounds = res.items
            .map((item) => ({ fullPath: item.fullPath, name: item.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    async function play(sound) {
        const url = await getDownloadURL(ref(storage, sound.fullPath));
        audio.src = url;
        audio.play();
    }

    async function accept(sound) {
        if (processing.has(sound.fullPath)) return;
        processing.add(sound.fullPath);
        try {
            const source = ref(storage, sound.fullPath);
            const blob = await getBlob(source);
            await uploadBytes(ref(storage, sound.name), blob, {
                contentType: blob.type || 'application/octet-stream',
            });
            await deleteObject(source);
            sounds = sounds.filter((s) => s.fullPath !== sound.fullPath);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la validation du son.');
        } finally {
            processing.delete(sound.fullPath);
        }
    }

    async function reject(sound) {
        if (processing.has(sound.fullPath)) return;
        if (!confirm(`Supprimer définitivement « ${sound.name} » ?`)) return;

        processing.add(sound.fullPath);
        try {
            await deleteObject(ref(storage, sound.fullPath));
            sounds = sounds.filter((s) => s.fullPath !== sound.fullPath);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la suppression du son.');
        } finally {
            processing.delete(sound.fullPath);
        }
    }
</script>

<svelte:head>
    <title>Modération</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h2>Modération</h2>

{#if authState === 'loading'}
    <div class="content">
        <p class="msg">Chargement...</p>
    </div>
{:else if authState === 'anon'}
    <div class="content">
        <form onsubmit={login} class="login-form">
            <label for="mod-email">Email</label>
            <input id="mod-email" type="email" autocomplete="username" bind:value={email} required />

            <label for="mod-password">Mot de passe</label>
            <input id="mod-password" type="password" autocomplete="current-password" bind:value={password} required />

            <button type="submit" class="button-fart" disabled={loggingIn}>
                {loggingIn ? 'Connexion...' : 'Se connecter'}
            </button>

            {#if loginError}
                <p class="msg error">{loginError}</p>
            {/if}
        </form>
    </div>
{:else}
    <div class="mod-toolbar">
        <button class="link-btn" onclick={loadSounds}>↻ Rafraîchir</button>
        <button class="link-btn" onclick={logout}>Se déconnecter</button>
    </div>

    <div class="content mod-list">
        {#if sounds === null}
            <p class="msg">Aucun sons ou non autorisé.</p>
        {:else if sounds.length === 0}
            <p class="msg">Aucun son en attente de modération. 🎉</p>
        {:else}
            {#each sounds as sound (sound.fullPath)}
                <div class="mod-item">
                    <span class="mod-name" title={sound.name}>{sound.name}</span>
                    <div class="mod-actions">
                        <button class="mod-btn play" onclick={() => play(sound)} disabled={processing.has(sound.fullPath)}>▶ Écouter</button>
                        <button class="mod-btn accept" onclick={() => accept(sound)} disabled={processing.has(sound.fullPath)}>✓ Accepter</button>
                        <button class="mod-btn reject" onclick={() => reject(sound)} disabled={processing.has(sound.fullPath)}>✕ Rejeter</button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
{/if}

<style>
    .content {
        padding: 0 20px;
    }

    .login-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 340px;
    }

    label {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        font-weight: 600;
        color: #555;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    input[type="email"],
    input[type="password"] {
        height: 48px;
        padding: 0 14px;
        font-family: "JetBrains Mono", monospace;
        font-size: 1em;
        color: #36395a;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 4px;
        outline: none;
        box-sizing: border-box;
    }

    .mod-toolbar {
        max-width: 720px;
        margin: 0 auto;
        padding: 0 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .link-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        color: #666;
        padding: 5px;
        border-radius: 6px;
    }

    .link-btn:hover {
        background: #f0f0f0;
        color: #111;
    }

    .mod-list {
        flex-direction: column;
        max-width: 720px;
        gap: 10px;
        margin: 20px auto;
    }

    .mod-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 6px;
        box-sizing: border-box;
        flex-wrap: wrap;
    }

    .mod-name {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85em;
        color: #36395a;
        word-break: break-all;
    }

    .mod-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .mod-btn {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        transition: opacity .15s, transform .1s;
    }

    .mod-btn:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .mod-btn:not(:disabled):hover {
        transform: translateY(-1px);
    }

    .mod-btn.play {
        background: #ececf5;
        color: #36395a;
    }

    .mod-btn.accept {
        background: #1a7f37;
        color: #fff;
    }

    .mod-btn.reject {
        background: #cf222e;
        color: #fff;
    }

    .msg {
        font-family: Helvetica, sans-serif;
    }

    .msg.error {
        color: #cf222e;
    }
</style>
