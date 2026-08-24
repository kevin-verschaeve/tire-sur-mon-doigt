/**
 * Encode (a slice of) an AudioBuffer into a 16-bit PCM WAV Blob.
 *
 * WAV is used on purpose: it is the only container the browser can produce
 * losslessly from raw PCM without an extra encoder, and it is accepted by the
 * upload (audio/wav).
 *
 * @param {AudioBuffer} audioBuffer
 * @param {{ start?: number, end?: number }} [range] start/end in seconds
 * @returns {Blob}
 */
export function encodeWav(audioBuffer, { start = 0, end } = {}) {
    const { sampleRate, numberOfChannels } = audioBuffer;
    const endTime = end ?? audioBuffer.duration;

    const startSample = Math.max(0, Math.floor(start * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
    const length = Math.max(0, endSample - startSample);

    const channels = [];
    for (let c = 0; c < numberOfChannels; c++) {
        channels.push(audioBuffer.getChannelData(c));
    }

    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let c = 0; c < numberOfChannels; c++) {
            const sample = clamp(channels[c][startSample + i] ?? 0);
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function clamp(sample) {
    return Math.max(-1, Math.min(1, sample));
}

function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
