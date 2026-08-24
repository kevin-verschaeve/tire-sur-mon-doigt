/**
 * Find the first and last moment the signal rises above a relative threshold,
 * so leading/trailing silence can be trimmed automatically.
 *
 * @param {AudioBuffer} audioBuffer
 * @param {{
 *   thresholdRatio?: number,
 *   minThreshold?: number,
 *   windowSeconds?: number,
 *   paddingSeconds?: number,
 * }} [options]
 * @returns {{ start: number, end: number }} bounds in seconds
 */
export function detectSoundBounds(
    audioBuffer,
    { thresholdRatio = 0.08, minThreshold = 0.01, windowSeconds = 0.02, paddingSeconds = 0.05 } = {},
) {
    const data = audioBuffer.getChannelData(0);
    const { sampleRate, duration } = audioBuffer;

    let maxPeak = 0;
    for (let i = 0; i < data.length; i++) {
        const value = Math.abs(data[i]);
        if (value > maxPeak) maxPeak = value;
    }
    if (maxPeak === 0) return { start: 0, end: duration };

    const threshold = Math.max(maxPeak * thresholdRatio, minThreshold);
    const windowSize = Math.max(1, Math.floor(sampleRate * windowSeconds));

    const peakFrom = (from) => {
        let peak = 0;
        const to = Math.min(from + windowSize, data.length);
        for (let i = from; i < to; i++) {
            const value = Math.abs(data[i]);
            if (value > peak) peak = value;
        }
        return peak;
    };

    let startSample = 0;
    for (let i = 0; i < data.length; i += windowSize) {
        if (peakFrom(i) >= threshold) {
            startSample = i;
            break;
        }
    }

    let endSample = data.length;
    for (let i = data.length - windowSize; i >= 0; i -= windowSize) {
        if (peakFrom(i) >= threshold) {
            endSample = Math.min(i + windowSize, data.length);
            break;
        }
    }

    // Small margin so the attack and tail of the sound are not clipped.
    const padding = Math.floor(sampleRate * paddingSeconds);
    startSample = Math.max(0, startSample - padding);
    endSample = Math.min(data.length, endSample + padding);

    if (endSample <= startSample) return { start: 0, end: duration };
    return { start: startSample / sampleRate, end: endSample / sampleRate };
}
