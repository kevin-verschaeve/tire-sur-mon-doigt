<script>
    import { drawWaveform } from '$lib/audio/waveform.js';
    import { detectSoundBounds } from '$lib/audio/analysis.js';
    import { encodeWav } from '$lib/audio/wav.js';
    import { formatSeconds } from '$lib/audio/format.js';

    /**
     * @typedef {Object} Labels
     * @property {string} trimTitle
     * @property {string} trimHint
     * @property {string} playSelection
     * @property {string} stopSelection
     * @property {string} resetTrim
     * @property {string} selectionLabel
     * @property {string} listen
     */

    /** @type {{ blob: Blob, disabled?: boolean, labels: Labels }} */
    let { blob, disabled = false, labels } = $props();

    let audioBuffer = $state(null);
    let start = $state(0);
    let end = $state(0);
    let previewing = $state(false);

    let canvas = $state(null);
    let wrap = $state(null);
    let fallbackUrl = $state(null);

    let audioContext = null;
    let previewSource = null;

    const MIN_GAP = 0.05; // durée minimale de sélection, en secondes

    function getContext() {
        if (!audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioContext = new Ctx();
        }
        return audioContext;
    }

    // On décode l'enregistrement pour afficher une forme d'onde. Si le
    // navigateur ne sait pas le décoder, on retombe sur un simple lecteur.
    async function decode(source) {
        stopPreview();
        audioBuffer = null;
        clearFallback();

        try {
            const arrayBuffer = await source.arrayBuffer();
            const decoded = await getContext().decodeAudioData(arrayBuffer);
            audioBuffer = decoded;
            ({ start, end } = detectSoundBounds(decoded));
        } catch (err) {
            console.error('Décodage impossible, rognage désactivé.', err);
            audioBuffer = null;
            fallbackUrl = URL.createObjectURL(source);
        }
    }

    /**
     * Returns the trimmed audio as a WAV Blob, or the original blob when the
     * recording could not be decoded for editing.
     * @returns {Blob}
     */
    export function getBlob() {
        stopPreview();
        return audioBuffer ? encodeWav(audioBuffer, { start, end }) : blob;
    }

    function startHandleDrag(which, event) {
        if (!audioBuffer || !wrap) return;
        event.preventDefault();
        const rect = wrap.getBoundingClientRect();
        const { duration } = audioBuffer;

        const onMove = (ev) => {
            const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
            const time = ratio * duration;
            if (which === 'start') start = Math.min(time, end - MIN_GAP);
            else end = Math.max(time, start + MIN_GAP);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    function selectAll() {
        if (!audioBuffer) return;
        start = 0;
        end = audioBuffer.duration;
    }

    function togglePreview() {
        if (previewing) {
            stopPreview();
            return;
        }
        if (!audioBuffer) return;

        const context = getContext();
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.onended = () => {
            if (previewSource === source) {
                previewSource = null;
                previewing = false;
            }
        };
        source.start(0, start, Math.max(0, end - start));
        previewSource = source;
        previewing = true;
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

    function clearFallback() {
        if (fallbackUrl) {
            URL.revokeObjectURL(fallbackUrl);
            fallbackUrl = null;
        }
    }

    const percent = (time) => (audioBuffer ? (time / audioBuffer.duration) * 100 : 0);

    // Décode à chaque nouvel enregistrement.
    $effect(() => {
        if (blob) decode(blob);
    });

    // (Re)dessine la forme d'onde une fois décodée, et au redimensionnement.
    $effect(() => {
        if (!audioBuffer || !canvas) return;
        drawWaveform(canvas, audioBuffer);
        const onResize = () => drawWaveform(canvas, audioBuffer);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    });

    $effect(() => {
        return () => {
            stopPreview();
            clearFallback();
            audioContext?.close();
        };
    });
</script>

{#if audioBuffer}
    <p class="listen">{labels.trimTitle}</p>
    <p class="hint">{labels.trimHint}</p>

    <div class="waveform" bind:this={wrap}>
        <canvas bind:this={canvas}></canvas>
        <div class="mask mask-left" style:width="{percent(start)}%"></div>
        <div class="mask mask-right" style:width="{100 - percent(end)}%"></div>
        <div
            class="handle"
            style:left="{percent(start)}%"
            onpointerdown={(e) => startHandleDrag('start', e)}
            role="slider"
            tabindex="0"
            aria-label="start"
            aria-valuenow={start}
        ></div>
        <div
            class="handle"
            style:left="{percent(end)}%"
            onpointerdown={(e) => startHandleDrag('end', e)}
            role="slider"
            tabindex="0"
            aria-label="end"
            aria-valuenow={end}
        ></div>
    </div>

    <p class="info">
        {labels.selectionLabel} : {formatSeconds(start)} → {formatSeconds(end)}
        ({formatSeconds(Math.max(0, end - start))})
    </p>

    <div class="actions">
        <button type="button" class="link-button" onclick={togglePreview} {disabled}>
            {previewing ? labels.stopSelection : labels.playSelection}
        </button>
        <button type="button" class="link-button" onclick={selectAll} {disabled}>
            {labels.resetTrim}
        </button>
    </div>
{:else if fallbackUrl}
    <p class="listen">{labels.listen}</p>
    <!-- svelte-ignore a11y_media_has_caption -->
    <audio src={fallbackUrl} controls></audio>
{/if}

<style>
    .listen {
        font-family: Helvetica, sans-serif;
        color: #555;
        margin: 4px 0 0;
    }

    .hint {
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
    .mask {
        position: absolute;
        top: 0;
        bottom: 0;
        background: rgba(54, 57, 90, 0.18);
        pointer-events: none;
    }

    .mask-left {
        left: 0;
    }

    .mask-right {
        right: 0;
    }

    .handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 12px;
        margin-left: -6px;
        cursor: ew-resize;
        touch-action: none;
    }

    /* Ligne verticale visible de la poignée. */
    .handle::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 5px;
        width: 2px;
        background: #cf222e;
    }

    /* Pastille de préhension. */
    .handle::after {
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

    .info {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8em;
        color: #36395a;
        margin: 0;
    }

    .actions {
        display: flex;
        gap: 16px;
    }

    audio {
        width: 100%;
    }
</style>
