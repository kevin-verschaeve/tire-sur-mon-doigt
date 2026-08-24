/**
 * Reactive MediaRecorder wrapper.
 *
 * Returns an object exposing reactive state (`recording`, `seconds`, `blob`,
 * `error`) plus control methods. Meant to be created once in a component and
 * disposed of when it unmounts.
 *
 * @param {{ maxSeconds?: number }} [options]
 */
export function createRecorder({ maxSeconds = 30 } = {}) {
    let recording = $state(false);
    let seconds = $state(0);
    let blob = $state(null);
    let error = $state(null); // 'mic' | null

    let mediaRecorder = null;
    let stream = null;
    let chunks = [];
    let timer = null;

    async function start() {
        error = null;
        reset();

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error(err);
            error = 'mic';
            return;
        }

        chunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            // Cut the mic as soon as we stop, otherwise the indicator stays on.
            stopStream();
            clearInterval(timer);
            recording = false;
            blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            chunks = [];
        };

        mediaRecorder.start();
        recording = true;
        seconds = 0;
        timer = setInterval(() => {
            seconds += 1;
            if (seconds >= maxSeconds) stop();
        }, 1000);
    }

    function stop() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    function toggle() {
        if (recording) stop();
        else start();
    }

    /** Drop the current recording (back to the initial state). */
    function reset() {
        blob = null;
        seconds = 0;
    }

    function stopStream() {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    function dispose() {
        clearInterval(timer);
        stop();
        stopStream();
    }

    return {
        get recording() {
            return recording;
        },
        get seconds() {
            return seconds;
        },
        get blob() {
            return blob;
        },
        get error() {
            return error;
        },
        maxSeconds,
        start,
        stop,
        toggle,
        reset,
        dispose,
    };
}
