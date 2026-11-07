import { describe, expect, it } from 'vitest';
import { highlightCode, MAX_HIGHLIGHT_CHARS } from '../src/syntax-highlight.js';
import { escapeHtml } from '../src/lib/html.js';

describe('highlightCode', () => {
    it('colours known languages, including aliases', () => {
        expect(highlightCode('{"a": 1}', 'json')).toContain('hljs-attr');
        expect(highlightCode('const x = 1;', 'js')).toContain('hljs-keyword');
    });

    it('escapes HTML in the code', () => {
        const html = highlightCode('<script>alert("x")</script>', 'xml');
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;');
    });

    it('returns null for unknown or missing languages and very large code', () => {
        expect(highlightCode('x', 'not-a-language')).toBeNull();
        expect(highlightCode('x', '')).toBeNull();
        expect(highlightCode('a'.repeat(MAX_HIGHLIGHT_CHARS + 1), 'json')).toBeNull();
    });
});

describe('escapeHtml', () => {
    it('escapes the five HTML special characters', () => {
        expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    });
});
