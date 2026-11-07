// Share links carry the whole document after "#share=", compressed and
// base64url-encoded. The part after "#" never reaches the server.

export const SHARE_PREFIX = '#share=';
// Longer links may be cut off by some chat apps.
export const LONG_LINK = 8000;
// Chrome's maximum URL length.
export const MAX_LINK = 2_000_000;
// Stops a tiny link from unpacking into a huge document.
const MAX_DECODED_BYTES = 5 * 1024 * 1024;

const toBase64Url = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text) => {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const encodeShare = async (text) => {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
};

// Throws when the data is broken, cut off, or unpacks past the size limit.
export const decodeShare = async (data) => {
    const stream = new Blob([fromBase64Url(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        size += value.length;
        if (size > MAX_DECODED_BYTES) {
            await reader.cancel();
            throw new Error('Shared document is too large');
        }
        chunks.push(value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(await new Blob(chunks).arrayBuffer());
};
