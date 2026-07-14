<script>
    import { storage } from '$lib/firebase.js'
    import { ref, uploadBytes } from 'firebase/storage'

    let { data } = $props();

    let files = $state(null);
    let uploading = $state(false);
    let status = $state(null); // 'success' | 'error' | null

    const t = {
        fr: {
            title: 'Proposer un prout',
            intro: 'Envoie ton meilleur prout !\nLes prouts doivent être des vrais, ils seront vérifiés avant validation.',
            label: 'Fichier audio',
            submit: 'Envoyer',
            uploading: 'Envoi...',
            success: 'Merci ! Ton prout a bien été envoyé. 💨',
            error: 'Oups, l’envoi a échoué. Réessaie.',
            noFile: 'Choisis d’abord un fichier audio.',
            notAudio: 'Seuls les fichiers audio sont autorisés.',
            meta: {
                title: 'Proposer un prout | Tire sur mon doigt !',
                description: 'Envoie ton propre son de prout. Il sera modéré avant d’intégrer la collection.',
            },
        },
        en: {
            title: 'Submit a fart',
            intro: 'Send us your best fart! Only send fart sound, it will be checked be approbation.',
            label: 'Audio file',
            submit: 'Send',
            uploading: 'Uploading...',
            success: 'Thanks! Your fart has been sent for review. 💨',
            error: 'Oops, the upload failed. Please try again.',
            noFile: 'Pick an audio file first.',
            notAudio: 'Only audio files are allowed.',
            meta: {
                title: 'Submit a fart | Pull my finger!',
                description: 'Send your own fart sound. It will be reviewed before joining the collection.',
            },
        },
    }[data.lang];

    async function handleSubmit(e) {
        e.preventDefault();
        status = null;

        const file = files?.[0];
        if (!file) {
            status = 'nofile';
            return;
        }

        // On n'autorise que les fichiers audio.
        if (!file.type || !file.type.startsWith('audio/')) {
            status = 'notaudio';
            return;
        }

        uploading = true;
        try {
            const dot = file.name.lastIndexOf('.');
            const ext = dot > 0 ? file.name.slice(dot) : '';
            const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
            await uploadBytes(ref(storage, `moderation/${name}`), file, {
                contentType: file.type,
            });
            status = 'success';
            files = null;
            e.target.reset();
        } catch (err) {
            console.error(err);
            status = 'error';
        } finally {
            uploading = false;
        }
    }
</script>

<svelte:head>
    <title>{t.meta.title}</title>
    <meta name="description" content={t.meta.description} />
</svelte:head>

<h2>{t.title}</h2>

<div class="content">
    <form class="upload-form" onsubmit={handleSubmit}>
        <p class="intro">{t.intro}</p>

        <label for="sound-input">{t.label}</label>
        <input
            id="sound-input"
            type="file"
            accept="audio/*"
            bind:files
            disabled={uploading}
        />

        <button type="submit" class="button-fart" disabled={uploading}>
            {uploading ? t.uploading : t.submit}
        </button>

        {#if status === 'success'}
            <p class="msg success">{t.success}</p>
        {:else if status === 'error'}
            <p class="msg error">{t.error}</p>
        {:else if status === 'nofile'}
            <p class="msg error">{t.noFile}</p>
        {:else if status === 'notaudio'}
            <p class="msg error">{t.notAudio}</p>
        {/if}
    </form>
</div>

<style>
    .content {
        padding: 0 20px;
    }

    .upload-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 460px;
    }

    .intro {
        color: #555;
        font-family: Helvetica, sans-serif;
        margin: 0 0 4px;
    }

    label {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        font-weight: 600;
        color: #555;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    input[type="file"] {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85em;
        color: #36395a;
        padding: 12px;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 4px;
    }

    .button-fart {
        width: 100%;
    }

    .msg {
        font-family: Helvetica, sans-serif;
        margin: 4px 0 0;
    }

    .msg.success {
        color: #1a7f37;
    }

    .msg.error {
        color: #cf222e;
    }
</style>
