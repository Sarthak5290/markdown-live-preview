import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '../src/lib/share.js';

describe('share links', () => {
    it.each([
        ['unicode and emoji', 'Héllo — 你好 — مرحبا — 🚀🎉\n'],
        ['code with special characters', '```js\nconst x = `a ${b}`; // "quotes" & <tags>\n```\n'],
        ['empty text', ''],
        ['large text', Array.from({ length: 4000 }, (_, i) => `Line ${i}: ${'lorem ipsum '.repeat(4)}`).join('\n')]
    ])('round-trips %s', async (_, text) => {
        const data = await encodeShare(text);
        expect(data).toMatch(/^[A-Za-z0-9_-]*$/);
        expect(await decodeShare(data)).toBe(text);
    });

    it('compresses repetitive text', async () => {
        const text = JSON.stringify({ items: Array.from({ length: 200 }, (_, i) => ({ id: i, marketplace_id: 'ATVPDKIKX0DER' })) });
        expect((await encodeShare(text)).length).toBeLessThan(text.length / 4);
    });

    it('rejects a cut-off link', async () => {
        const data = await encodeShare('x'.repeat(5000) + Math.random());
        await expect(decodeShare(data.slice(0, data.length / 2))).rejects.toThrow();
    });

    it.each([['not*valid*base64!'], ['AAAAAAAAAAAA']])('rejects broken data %s', async (data) => {
        await expect(decodeShare(data)).rejects.toThrow();
    });

    it('refuses a link that would unpack past 5 MB', async () => {
        const data = await encodeShare('a'.repeat(6 * 1024 * 1024));
        await expect(decodeShare(data)).rejects.toThrow(/too large/);
    });
});
