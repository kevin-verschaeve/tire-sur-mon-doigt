/**
 * Draw the waveform of an AudioBuffer onto a canvas, sized to its CSS box
 * (device-pixel aware).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {AudioBuffer} audioBuffer
 * @param {{ color?: string }} [options]
 */
export function drawWaveform(canvas, audioBuffer, { color = '#8f93c0' } = {}) {
    if (!canvas || !audioBuffer) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / width));
    const amplitude = height / 2;

    for (let x = 0; x < width; x++) {
        let min = 1;
        let max = -1;
        const base = x * step;
        for (let i = 0; i < step; i++) {
            const value = data[base + i] ?? 0;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        ctx.fillRect(x, (1 + min) * amplitude, 1, Math.max(1, (max - min) * amplitude));
    }
}
