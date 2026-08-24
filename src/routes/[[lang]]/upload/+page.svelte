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

    // Rognage : forme d'onde décodée + bornes de sélection (en secondes).
    let audioBuffer = $state(null);
    let trimStart = $state(0);
    let trimEnd = $state(0);
    let previewing = $state(false);
    let waveCanvas = $state(null);
    let waveWrap = $state(null);

    let recorder = null;
    let chunks = [];
    let timer = null;
    let fileInput = $state(null);
    let audioCtx = null;
    let previewSource = null;

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
            discard: 'Supprimer',
            micError: 'Impossible d’accéder au micro. Vérifie les autorisations.',
            trimTitle: 'Rogne ton prout pour couper les blancs :',
            trimHint: 'Fais glisser les poignées pour garder uniquement le son.',
            playSelection: 'Écouter la sélection',
            stopSelection: 'Arrêter',
            resetTrim: 'Tout sélectionner',
            selectionLabel: 'Sélection',
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
            discard: 'Delete',
            micError: 'Could not access the microphone. Check your permissions.',
            trimTitle: 'Trim your fart to cut the silence:',
            trimHint: 'Drag the handles to keep only the sound.',
            playSelection: 'Play selection',
            stopSelection: 'Stop',
            resetTrim: 'Select all',
            selectionLabel: 'Selection',
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
        stopPreview();
        if (recordedUrl) {
            URL.revokeObjectURL(recordedUrl);
        }
        recordedUrl = null;
        recordedBlob = null;
        recordSeconds = 0;
        audioBuffer = null;
        trimStart = 0;
        trimEnd = 0;
    }

    // Jette l'enregistrement et revient à l'état initial (choix de fichier).
    function discardRecording() {
        clearRecording();
        status = null;
    }

    function formatTime(seconds) {
        return `${(seconds ?? 0).toFixed(2)}s`;
    }

    function getAudioContext() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }
        return audioCtx;
    }

    // On décode l'enregistrement pour afficher une forme d'onde et permettre
    // le rognage. Si le décodage échoue (certains navigateurs), on retombe
    // sur le simple lecteur audio.
    async function prepareEditing(blob) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await getAudioContext().decodeAudioData(arrayBuffer);
            audioBuffer = decoded;
            const [start, end] = detectSoundBounds(decoded);
            trimStart = start;
            trimEnd = end;
        } catch (err) {
            console.error('Décodage impossible, rognage désactivé.', err);
            audioBuffer = null;
        }
    }

    // Détecte le premier et le dernier passage au-dessus d'un seuil pour
    // proposer d'emblée une sélection sans les blancs.
    function detectSoundBounds(buffer) {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const duration = buffer.duration;

        let maxPeak = 0;
        for (let i = 0; i < data.length; i++) {
            const a = Math.abs(data[i]);
            if (a > maxPeak) maxPeak = a;
        }
        if (maxPeak === 0) return [0, duration];

        const threshold = Math.max(maxPeak * 0.08, 0.01);
        const win = Math.max(1, Math.floor(sampleRate * 0.02));

        const peakInWindow = (from) => {
            let peak = 0;
            const to = Math.min(from + win, data.length);
            for (let j = from; j < to; j++) {
                const a = Math.abs(data[j]);
                if (a > peak) peak = a;
            }
            return peak;
        };

        let startSample = 0;
        for (let i = 0; i < data.length; i += win) {
            if (peakInWindow(i) >= threshold) {
                startSample = i;
                break;
            }
        }

        let endSample = data.length;
        for (let i = data.length - win; i >= 0; i -= win) {
            if (peakInWindow(i) >= threshold) {
                endSample = Math.min(i + win, data.length);
                break;
            }
        }

        // Petite marge pour ne pas couper l'attaque ni la fin du son.
        const pad = Math.floor(sampleRate * 0.05);
        startSample = Math.max(0, startSample - pad);
        endSample = Math.min(data.length, endSample + pad);

        if (endSample <= startSample) return [0, duration];
        return [startSample / sampleRate, endSample / sampleRate];
    }

    function drawWaveform() {
        if (!waveCanvas || !audioBuffer) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = waveCanvas.getBoundingClientRect();
        if (rect.width === 0) return;
        const w = Math.floor(rect.width * dpr);
        const h = Math.floor(rect.height * dpr);
        waveCanvas.width = w;
        waveCanvas.height = h;

        const ctx = waveCanvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const data = audioBuffer.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / w));
        const amp = h / 2;

        ctx.fillStyle = '#8f93c0';
        for (let x = 0; x < w; x++) {
            let min = 1;
            let max = -1;
            const base = x * step;
            for (let j = 0; j < step; j++) {
                const d = data[base + j] ?? 0;
                if (d < min) min = d;
                if (d > max) max = d;
            }
            ctx.fillRect(x, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    function startHandleDrag(which, event) {
        if (!audioBuffer || !waveWrap) return;
        event.preventDefault();
        const rect = waveWrap.getBoundingClientRect();
        const duration = audioBuffer.duration;
        const minGap = 0.05;

        const onMove = (ev) => {
            let pct = (ev.clientX - rect.left) / rect.width;
            pct = Math.min(1, Math.max(0, pct));
            const t = pct * duration;
            if (which === 'start') {
                trimStart = Math.min(t, trimEnd - minGap);
            } else {
                trimEnd = Math.max(t, trimStart + minGap);
            }
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    function resetTrim() {
        if (!audioBuffer) return;
        trimStart = 0;
        trimEnd = audioBuffer.duration;
    }

    function stopPreview() {
        if (previewSource) {
            try {
                previewSource.stop();
            } catch {
                // déjà arrêté
            }
            previewSource = null;
        }
        previewing = false;
    }

    function togglePreview() {
        if (previewing) {
            stopPreview();
            return;
        }
        if (!audioBuffer) return;

        const ctx = getAudioContext();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
            if (previewSource === source) {
                previewSource = null;
                previewing = false;
            }
        };
        const duration = Math.max(0, trimEnd - trimStart);
        source.start(0, trimStart, duration);
        previewSource = source;
        previewing = true;
    }

    // Encode la portion sélectionnée de l'AudioBuffer en WAV (PCM 16 bits).
    function encodeSelectionToWav() {
        const buffer = audioBuffer;
        const sampleRate = buffer.sampleRate;
        const numChannels = buffer.numberOfChannels;
        const startSample = Math.floor(trimStart * sampleRate);
        const endSample = Math.min(buffer.length, Math.floor(trimEnd * sampleRate));
        const length = Math.max(0, endSample - startSample);

        const channels = [];
        for (let c = 0; c < numChannels; c++) {
            channels.push(buffer.getChannelData(c));
        }

        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const dataSize = length * blockAlign;
        const out = new ArrayBuffer(44 + dataSize);
        const view = new DataView(out);

        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let c = 0; c < numChannels; c++) {
                let sample = channels[c][startSample + i] ?? 0;
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
                offset += 2;
            }
        }

        return new Blob([out], { type: 'audio/wav' });
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

            // On prépare le rognage (forme d'onde + détection des blancs).
            prepareEditing(recordedBlob);
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

        stopPreview();

        // Un fichier choisi a la priorité ; sinon on envoie l'enregistrement,
        // rogné en WAV si on a pu le décoder.
        let file = files?.[0];
        if (!file) {
            file = audioBuffer ? encodeSelectionToWav() : recordedBlob;
        }
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

    // (Re)dessine la forme d'onde dès qu'un enregistrement est décodé.
    $effect(() => {
        if (audioBuffer && waveCanvas) {
            drawWaveform();
        }
    });

    $effect(() => {
        const onResize = () => drawWaveform();
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            clearInterval(timer);
            stopPreview();
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
                {#if audioBuffer}
                    <p class="listen">{t.trimTitle}</p>
                    <p class="trim-hint">{t.trimHint}</p>

                    <div class="waveform" bind:this={waveWrap}>
                        <canvas bind:this={waveCanvas}></canvas>
                        <div
                            class="wave-mask wave-mask-left"
                            style:width="{(trimStart / audioBuffer.duration) * 100}%"
                        ></div>
                        <div
                            class="wave-mask wave-mask-right"
                            style:width="{(1 - trimEnd / audioBuffer.duration) * 100}%"
                        ></div>
                        <div
                            class="wave-handle"
                            style:left="{(trimStart / audioBuffer.duration) * 100}%"
                            onpointerdown={(e) => startHandleDrag('start', e)}
                            role="slider"
                            tabindex="0"
                            aria-label="start"
                            aria-valuenow={trimStart}
                        ></div>
                        <div
                            class="wave-handle"
                            style:left="{(trimEnd / audioBuffer.duration) * 100}%"
                            onpointerdown={(e) => startHandleDrag('end', e)}
                            role="slider"
                            tabindex="0"
                            aria-label="end"
                            aria-valuenow={trimEnd}
                        ></div>
                    </div>

                    <p class="trim-info">
                        {t.selectionLabel} : {formatTime(trimStart)} → {formatTime(trimEnd)}
                        ({formatTime(Math.max(0, trimEnd - trimStart))})
                    </p>

                    <div class="trim-actions">
                        <button
                            type="button"
                            class="link-button"
                            onclick={togglePreview}
                            disabled={uploading}
                        >
                            {previewing ? t.stopSelection : t.playSelection}
                        </button>
                        <button
                            type="button"
                            class="link-button"
                            onclick={resetTrim}
                            disabled={uploading}
                        >
                            {t.resetTrim}
                        </button>
                    </div>
                {:else}
                    <p class="listen">{t.listen}</p>
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <audio src={recordedUrl} controls></audio>
                {/if}

                <div class="record-actions">
                    <button
                        type="button"
                        class="link-button"
                        onclick={startRecording}
                        disabled={uploading}
                    >
                        {t.again}
                    </button>
                    <button
                        type="button"
                        class="link-button link-danger"
                        onclick={discardRecording}
                        disabled={uploading}
                    >
                        {t.discard}
                    </button>
                </div>
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

    .trim-hint {
        font-family: Helvetica, sans-serif;
        font-size: 0.8em;
        color: #999;
        margin: 0;
    }

    .waveform {
        position: relative;
        width: 100%;
        height: 90px;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 4px;
        overflow: hidden;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
    }

    .waveform canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    /* Voile grisé sur les zones exclues de la sélection. */
    .wave-mask {
        position: absolute;
        top: 0;
        bottom: 0;
        background: rgba(54, 57, 90, 0.18);
        pointer-events: none;
    }

    .wave-mask-left {
        left: 0;
    }

    .wave-mask-right {
        right: 0;
    }

    .wave-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 12px;
        margin-left: -6px;
        cursor: ew-resize;
        touch-action: none;
    }

    /* Ligne verticale visible de la poignée. */
    .wave-handle::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 5px;
        width: 2px;
        background: #cf222e;
    }

    /* Pastille de préhension. */
    .wave-handle::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 12px;
        height: 12px;
        transform: translate(-50%, -50%);
        background: #cf222e;
        border-radius: 50%;
        box-shadow: rgba(45, 35, 66, 0.3) 0 1px 3px;
    }

    .trim-info {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8em;
        color: #36395a;
        margin: 0;
    }

    .trim-actions {
        display: flex;
        gap: 16px;
    }

    .record-actions {
        display: flex;
        gap: 16px;
    }

    .link-danger {
        color: #cf222e;
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
