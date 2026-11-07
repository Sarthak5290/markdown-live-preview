// The marked renderer: code colours, plain JSON as formatted blocks, Mermaid
// diagram placeholders, and editor line numbers on top-level headings.
import { marked } from 'marked';
import { detectJson } from '../lib/json-preview.js';
import { escapeHtml } from '../lib/html.js';
import { highlightCode } from './syntax-highlight.js';

// Returns null when the language is unknown or the code is too large.
const renderHighlightedCode = (code, lang) => {
    const highlighted = highlightCode(code, lang);
    if (highlighted === null) {
        return null;
    }
    return `<pre><code class="hljs language-${escapeHtml(lang)}">${highlighted}\n</code></pre>\n`;
};

// Renders JSON found outside a code block, with a note when it is invalid.
export const renderJsonBlock = ({ valid, text, error }) => {
    const code = renderHighlightedCode(text, 'json')
        ?? `<pre><code class="language-json">${escapeHtml(text)}\n</code></pre>\n`;
    if (valid) {
        return code;
    }
    return `<div class="json-error">Invalid JSON: ${escapeHtml(error)}</div>\n${code}`;
};

export const createMarkedRenderer = () => {
    const renderer = new marked.Renderer();
    const renderCode = renderer.code.bind(renderer);
    const renderParagraph = renderer.paragraph.bind(renderer);
    const renderHeading = renderer.heading.bind(renderer);

    renderer.code = (token) => {
        const lang = (token.lang || '').match(/^\S*/)?.[0].toLowerCase();
        if (lang === 'mermaid') {
            return `<pre class="mermaid">${escapeHtml(token.text)}</pre>\n`;
        }

        return renderHighlightedCode(token.text.replace(/\n$/, ''), lang) ?? renderCode(token);
    };

    renderer.paragraph = (token) => {
        // marked also calls this for loose text that is already HTML-escaped;
        // that text cannot be checked as JSON.
        const alreadyEscaped = token.tokens?.length === 1 && token.tokens[0].escaped;
        const json = alreadyEscaped ? null : detectJson(token.text);
        return json ? renderJsonBlock(json) : renderParagraph(token);
    };

    // Top-level headings carry their editor line so the outline can jump to them.
    renderer.heading = (token) => {
        const html = renderHeading(token);
        return token.sourceLine
            ? html.replace(/^<h([1-6])>/, `<h$1 data-source-line="${token.sourceLine}">`)
            : html;
    };

    return renderer;
};
