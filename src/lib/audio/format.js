// MediaRecorder negotiates its own mime type (webm on Chrome/Firefox, mp4 on
// Safari), so we map it back to a file extension for the upload.
const AUDIO_EXTENSIONS = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
};

/**
 * Guess a file extension from a mime type.
 * @param {string} mimeType
 * @returns {string}
 */
export function extensionFor(mimeType) {
    const base = (mimeType || '').split(';')[0];
    return AUDIO_EXTENSIONS[base] ?? '.webm';
}

/**
 * Extension of an uploaded file (from its name) or a recorded blob (from its
 * mime type).
 * @param {File | Blob} file
 * @returns {string}
 */
export function extensionForFile(file) {
    if (file.name) {
        const dot = file.name.lastIndexOf('.');
        return dot > 0 ? file.name.slice(dot) : '';
    }
    return extensionFor(file.type);
}

/**
 * Format a duration in seconds as e.g. "1.20s".
 * @param {number} seconds
 * @returns {string}
 */
export function formatSeconds(seconds) {
    return `${(seconds ?? 0).toFixed(2)}s`;
}
