<script>
    import { storage } from '$lib/firebase.js'
    import { ref, uploadBytes } from 'firebase/storage'

    let { data } = $props();

    let files = $state(null);
    let uploading = $state(false);
    let status = $state(null); // 'success' | 'error' | null

    let recording = $state(false);
    let recordedBlob = $state(null);
    let recordedUrl = $state(null);
    let recordSeconds = $state(0);

    let recorder = null;
    let chunks = [];
    let timer = null;
    let fileInput = $state(null);

    // Durée max d'un prout, on ne veut pas d'un album complet.
    const MAX_SECONDS = 30;

    const supportsRecording =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined';

    const t = {
        fr: {
            title: 'Proposer un prout',
            intro: 'Envoie ton meilleur prout !\nLes prouts doivent être des vrais, ils seront vérifiés avant validation.',
            label: 'Fichier audio',
            submit: 'Envoyer',
            uploading: 'Envoi...',
            success: 'Merci ! Ton prout a bien été envoyé. 💨',
            error: 'Oups, l’envoi a échoué. Réessaie.',
            noFile: 'Choisis d’abord un fichier audio ou enregistre un prout.',
            notAudio: 'Seuls les fichiers audio sont autorisés.',
            or: 'ou',
            record: 'Enregistrer un prout',
            stop: 'Arrêter l’enregistrement',
            recording: 'Enregistrement en cours...',
            listen: 'Réécoute ton prout avant de l’envoyer :',
            again: 'Recommencer',
            micError: 'Impossible d’accéder au micro. Vérifie les autorisations.',
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
            noFile: 'Pick an audio file or record a fart first.',
            notAudio: 'Only audio files are allowed.',
            or: 'or',
            record: 'Record a fart',
            stop: 'Stop recording',
            recording: 'Recording...',
            listen: 'Listen to your fart before sending it:',
            again: 'Record again',
            micError: 'Could not access the microphone. Check your permissions.',
            meta: {
                title: 'Submit a fart | Pull my finger!',
                description: 'Send your own fart sound. It will be reviewed before joining the collection.',
            },
        },
    }[data.lang];

    // Le mimeType négocié par MediaRecorder varie selon le navigateur
    // (webm sur Chrome/Firefox, mp4 sur Safari), on en déduit l'extension.
    function extensionFor(mimeType) {
        const base = (mimeType || '').split(';')[0];
        return {
            'audio/webm': '.webm',
            'audio/ogg': '.ogg',
            'audio/mp4': '.m4a',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
        }[base] ?? '.webm';
    }

    function clearRecording() {
        if (recordedUrl) {
            URL.revokeObjectURL(recordedUrl);
        }
        recordedUrl = null;
        recordedBlob = null;
        recordSeconds = 0;
    }

    async function startRecording() {
        status = null;
        clearRecording();

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error(err);
            status = 'micerror';
            return;
        }

        chunks = [];
        recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            // On coupe le micro dès l'arrêt, sinon l'indicateur reste allumé.
            stream.getTracks().forEach((track) => track.stop());
            clearInterval(timer);
            recording = false;

            const type = recorder.mimeType || 'audio/webm';
            recordedBlob = new Blob(chunks, { type });
            recordedUrl = URL.createObjectURL(recordedBlob);
            chunks = [];

            // Un enregistrement remplace le fichier éventuellement choisi.
            files = null;
            if (fileInput) {
                fileInput.value = '';
            }
        };

        recorder.start();
        recording = true;
        recordSeconds = 0;
        timer = setInterval(() => {
            recordSeconds += 1;
            if (recordSeconds >= MAX_SECONDS) {
                stopRecording();
            }
        }, 1000);
    }

    function stopRecording() {
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    }

    function toggleRecording() {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function handleFileChange() {
        // Un fichier choisi remplace l'enregistrement.
        if (files?.[0]) {
            clearRecording();
        }
        status = null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        status = null;

        if (recording) {
            return;
        }

        const file = files?.[0] ?? recordedBlob;
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
            let ext;
            if (file.name) {
                const dot = file.name.lastIndexOf('.');
                ext = dot > 0 ? file.name.slice(dot) : '';
            } else {
                ext = extensionFor(file.type);
            }
            const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
            await uploadBytes(ref(storage, `moderation/${name}`), file, {
                contentType: file.type,
            });
            status = 'success';
            files = null;
            clearRecording();
            e.target.reset();
        } catch (err) {
            console.error(err);
            status = 'error';
        } finally {
            uploading = false;
        }
    }

    $effect(() => {
        return () => {
            clearInterval(timer);
            if (recordedUrl) {
                URL.revokeObjectURL(recordedUrl);
            }
        };
    });
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
            bind:this={fileInput}
            onchange={handleFileChange}
            disabled={uploading || recording}
        />

        {#if supportsRecording}
            <p class="separator">{t.or}</p>

            <button
                type="button"
                class="button-fart button-record"
                class:is-recording={recording}
                onclick={toggleRecording}
                disabled={uploading}
            >
                <span class="icon" aria-hidden="true">{recording ? '■' : '●'}</span>
                {recording ? t.stop : t.record}
            </button>

            {#if recording}
                <p class="msg recording">
                    {t.recording} {recordSeconds}s / {MAX_SECONDS}s
                </p>
            {/if}

            {#if recordedUrl}
                <p class="listen">{t.listen}</p>
                <!-- svelte-ignore a11y_media_has_caption -->
                <audio src={recordedUrl} controls></audio>
                <button
                    type="button"
                    class="link-button"
                    onclick={startRecording}
                    disabled={uploading}
                >
                    {t.again}
                </button>
            {/if}
        {/if}

        <button
            type="submit"
            class="button-fart button-submit"
            disabled={uploading || recording}
        >
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
        {:else if status === 'micerror'}
            <p class="msg error">{t.micError}</p>
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

    /* Bouton secondaire : contour rouge, fond clair. */
    .button-record {
        gap: 10px;
        color: #cf222e;
        background-color: #fff5f5;
        box-shadow: #f3c3c3 0 0 0 1.5px inset,
            rgba(45, 35, 66, 0.15) 0 2px 4px,
            #f3c3c3 0 -3px 0 inset;
    }

    .button-record:hover:not(:disabled) {
        background-color: #ffecec;
        box-shadow: #f3c3c3 0 0 0 1.5px inset,
            rgba(45, 35, 66, 0.25) 0 4px 8px,
            #f3c3c3 0 -3px 0 inset;
    }

    .button-record .icon {
        font-size: 0.8em;
        line-height: 1;
    }

    /* Pendant l'enregistrement, le bouton s'inverse et pulse. */
    .button-record.is-recording {
        color: #fff;
        background-color: #cf222e;
        box-shadow: rgba(207, 34, 46, 0.4) 0 2px 4px,
            rgba(207, 34, 46, 0.3) 0 7px 13px -3px,
            #a5121c 0 -3px 0 inset;
    }

    .button-record.is-recording:hover:not(:disabled) {
        background-color: #b91c26;
    }

    .button-record.is-recording .icon {
        animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
        50% {
            opacity: 0.25;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .button-record.is-recording .icon {
            animation: none;
        }
    }

    /* Action principale : pleine, foncée, visuellement dominante. */
    .button-submit {
        margin-top: 8px;
        color: #fff;
        font-weight: 700;
        background-color: #36395a;
        box-shadow: rgba(45, 35, 66, 0.4) 0 2px 4px,
            rgba(45, 35, 66, 0.3) 0 7px 13px -3px,
            #24263c 0 -3px 0 inset;
    }

    .button-submit:hover:not(:disabled) {
        background-color: #2b2e4a;
    }

    .button-fart:disabled,
    .button-fart:disabled:hover,
    .button-fart:disabled:active {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
    }

    .separator {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        color: #999;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
    }

    .listen {
        font-family: Helvetica, sans-serif;
        color: #555;
        margin: 4px 0 0;
    }

    audio {
        width: 100%;
    }

    .link-button {
        align-self: flex-start;
        appearance: none;
        background: none;
        border: 0;
        padding: 0;
        color: #36395a;
        cursor: pointer;
        font-family: Helvetica, sans-serif;
        font-size: 0.9em;
        text-decoration: underline;
    }

    .msg.recording {
        color: #cf222e;
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
