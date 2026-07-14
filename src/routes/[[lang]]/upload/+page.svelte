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
            intro: 'Envoie ton meilleur prout ! Il passera en modération avant d’apparaître dans la Proutbox.',
            label: 'Fichier audio',
            submit: 'Envoyer en modération',
            uploading: 'Envoi…',
            success: 'Merci ! Ton prout a bien été envoyé en modération. 💨',
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
            intro: 'Send us your best fart! It will be reviewed before showing up in the Fart Box.',
            label: 'Audio file',
            submit: 'Send for review',
            uploading: 'Uploading…',
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

    function sanitize(name) {
        return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    }

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
            const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitize(file.name)}`;
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
    <meta name="robots" content="noindex" />
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
