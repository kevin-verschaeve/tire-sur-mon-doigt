<script>
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms';
    import { storage } from '$lib/firebase.js'
    import { ref, listAll, getBlob, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage'

    let { data, form } = $props();

    let sounds = $state(null);   // null = loading, [] = empty
    let audio = $state(null);
    let busy = $state({});       // fullPath -> boolean

    onMount(() => {
        if (data.authed) {
            audio = new Audio();
            loadSounds();
        }
    });

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

    // Displayed filename without the `moderation/` prefix and generated id part.
    function displayName(name) {
        return name.replace(/^\d+-[0-9a-f]{8}-/, '');
    }

    async function accept(sound) {
        if (busy[sound.fullPath]) return;
        busy = { ...busy, [sound.fullPath]: true };
        try {
            const source = ref(storage, sound.fullPath);
            const blob = await getBlob(source);
            // Accepted sounds live at the storage root, alongside the ones the
            // Proutbox lists for playback.
            await uploadBytes(ref(storage, sound.name), blob, {
                contentType: blob.type || 'application/octet-stream',
            });
            await deleteObject(source);
            sounds = sounds.filter((s) => s.fullPath !== sound.fullPath);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la validation du son.');
        } finally {
            const { [sound.fullPath]: _, ...rest } = busy;
            busy = rest;
        }
    }

    async function reject(sound) {
        if (busy[sound.fullPath]) return;
        if (!confirm(`Supprimer définitivement « ${displayName(sound.name)} » ?`)) return;
        busy = { ...busy, [sound.fullPath]: true };
        try {
            await deleteObject(ref(storage, sound.fullPath));
            sounds = sounds.filter((s) => s.fullPath !== sound.fullPath);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la suppression du son.');
        } finally {
            const { [sound.fullPath]: _, ...rest } = busy;
            busy = rest;
        }
    }
</script>

<svelte:head>
    <title>Modération</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h2>Modération</h2>

{#if !data.authed}
    <div class="content">
        <form method="POST" action="?/login" use:enhance class="login-form">
            <label for="mod-password">Mot de passe</label>
            <input id="mod-password" name="password" type="password" autocomplete="off" required />
            <button type="submit" class="button-fart">Entrer</button>
            {#if form?.error}
                <p class="msg error">Mot de passe incorrect.</p>
            {/if}
        </form>
    </div>
{:else}
    <div class="mod-toolbar">
        <button class="link-btn" onclick={loadSounds}>↻ Rafraîchir</button>
        <form method="POST" action="?/logout" use:enhance class="inline-form">
            <button type="submit" class="link-btn">Se déconnecter</button>
        </form>
    </div>

    <div class="content mod-list">
        {#if sounds === null}
            <p class="msg">Chargement…</p>
        {:else if sounds.length === 0}
            <p class="msg">Aucun son en attente de modération. 🎉</p>
        {:else}
            {#each sounds as sound (sound.fullPath)}
                <div class="mod-item">
                    <span class="mod-name" title={sound.name}>{displayName(sound.name)}</span>
                    <div class="mod-actions">
                        <button class="mod-btn play" onclick={() => play(sound)} disabled={busy[sound.fullPath]}>▶ Écouter</button>
                        <button class="mod-btn accept" onclick={() => accept(sound)} disabled={busy[sound.fullPath]}>✓ Accepter</button>
                        <button class="mod-btn reject" onclick={() => reject(sound)} disabled={busy[sound.fullPath]}>✕ Rejeter</button>
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

    .inline-form {
        margin: 0;
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
