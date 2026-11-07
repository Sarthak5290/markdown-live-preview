// Turns the editor text into the preview: Markdown (or a whole JSON document)
// to sanitized HTML, then the copy buttons and link behaviour.
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { detectJson } from '../lib/json-preview.js';
import { markHeadingLines } from '../lib/headings.js';
import { createMarkedRenderer, renderJsonBlock } from './renderer.js';
import { addCopyButtons, openLinksInNewTab } from './code-blocks.js';

export const createPreview = (output, afterRender) => {
    const renderer = createMarkedRenderer();

    const render = (markdown) => {
        // marked.lexer/parser use these options as given (unlike marked.parse, which
        // merges them), so start from the defaults to keep GFM tables, task lists, etc.
        const options = { ...marked.defaults, renderer };
        // A document that is entirely JSON (such as an opened .json file) skips
        // Markdown parsing, so blank lines or indentation inside it still work.
        const json = detectJson(markdown);
        let html;
        if (json) {
            html = renderJsonBlock(json);
        } else {
            // Same as marked.parse, split in two so heading lines can be added in between.
            const source = markdown.replace(/\r\n?/g, '\n');
            const tokens = marked.lexer(source, options);
            markHeadingLines(source, tokens);
            html = marked.parser(tokens, options);
        }
        output.innerHTML = DOMPurify.sanitize(html);
        addCopyButtons(output);
        openLinksInNewTab(output);
        afterRender();
    };

    return { render };
};
