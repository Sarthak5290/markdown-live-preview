import { marked } from 'marked';
import { describe, expect, it } from 'vitest';
import { markHeadingLines } from '../src/lib/headings.js';

const headingLines = (source) => {
    const tokens = marked.lexer(source);
    markHeadingLines(source, tokens);
    return tokens.filter((t) => t.type === 'heading').map((t) => [t.text, t.sourceLine]);
};

describe('markHeadingLines', () => {
    it('finds the line of each top-level heading', () => {
        const source = [
            '# Title',          // 1
            '',
            '[ref]: https://x.y', // 3: link definition, dropped from tokens
            '',
            'Text',
            '',
            'Setext Head',      // 7
            '===========',
            '',
            '```md',
            '# not a heading',  // inside a code block
            '```',
            '',
            '## Second'         // 14
        ].join('\n');
        expect(headingLines(source)).toEqual([['Title', 1], ['Setext Head', 7], ['Second', 14]]);
    });

    it('skips headings inside blockquotes and raw HTML headings', () => {
        const source = '> ## quoted\n\n<h2>raw</h2>\n\n### Real\n';
        const tokens = marked.lexer(source);
        markHeadingLines(source, tokens);
        expect(tokens.filter((t) => t.sourceLine).map((t) => [t.text, t.sourceLine])).toEqual([['Real', 5]]);
    });
});
