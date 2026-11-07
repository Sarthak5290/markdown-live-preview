// Extras added to the preview after each render: a copy button on every code
// block, and web links that open in a new tab.
import { copyToClipboard } from '../ui/clipboard.js';

const copyButtonTemplate = document.createElement('template');
copyButtonTemplate.innerHTML = '<button type="button" class="code-copy-button" aria-label="Copy code" title="Copy code">'
    + '<svg class="icon-copy" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>'
    + '<svg class="icon-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>'
    + '</button>';

// Puts a copy button beside each rendered block. The button sits outside the
// <pre> so it does not scroll sideways with long lines.
export const addCopyButtons = (output) => {
    output.querySelectorAll('pre').forEach((pre) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        pre.replaceWith(wrapper);
        wrapper.append(pre, copyButtonTemplate.content.firstElementChild.cloneNode(true));
    });
};

// Web links open in a new tab so the editor stays open; "#" links still scroll in place.
export const openLinksInNewTab = (output) => {
    output.querySelectorAll('a[href]').forEach((link) => {
        if (link.getAttribute('href').startsWith('#') || !/^https?:$/.test(link.protocol)) {
            return;
        }
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });
};

// One listener for every block's copy button, since the preview is rebuilt on each edit.
export const setupCodeCopyButtons = (output) => {
    output.addEventListener('click', (event) => {
        const button = event.target.closest('.code-copy-button');
        if (!button) {
            return;
        }
        const pre = button.parentElement.querySelector('pre');
        const text = pre.classList.contains('mermaid')
            ? pre.dataset.mermaidSource ?? pre.textContent
            : pre.textContent.replace(/\n$/, '');

        const setLabel = (label, copied) => {
            button.classList.toggle('copied', copied);
            button.setAttribute('aria-label', label);
            button.title = label;
        };
        const flash = (label, copied) => {
            setLabel(label, copied);
            clearTimeout(button.resetTimer);
            button.resetTimer = setTimeout(() => setLabel('Copy code', false), 1500);
        };
        copyToClipboard(text, () => flash('Copied!', true), () => flash('Copy failed', false));
    });
};
