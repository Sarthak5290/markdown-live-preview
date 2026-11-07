import Storehouse from 'storehouse-js';
import * as monaco from 'monaco-editor';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { highlightCode } from './syntax-highlight.js';
import { detectJson } from './lib/json-preview.js';
import { escapeHtml } from './lib/html.js';
import { markHeadingLines } from './lib/headings.js';
import { setupPreviewSearch } from './preview-search.js';
import { setupOutline } from './outline.js';
import { SHARE_PREFIX, LONG_LINK, MAX_LINK, encodeShare, decodeShare } from './lib/share.js';
import { registerSW } from 'virtual:pwa-register';

const init = () => {
    let hasEdited = false;
    let scrollBarSync = false;

    const localStorageNamespace = 'com.markdownlivepreview';
    const localStorageKey = 'last_state';
    const localStorageScrollBarKey = 'scroll_bar_settings';
    const localStorageThemeKey = 'theme_settings';
    const localStorageViewModeKey = 'view_mode';
    const localStorageOutlineKey = 'outline_open';
    const localStorageBeforeShareKey = 'before_share';
    const localStorageViewModePhoneKey = 'view_mode_phone';

    // Phones show one pane at a time; below laptop width the outline is a drawer.
    const phoneQuery = window.matchMedia('(max-width: 767px)');
    const drawerQuery = window.matchMedia('(max-width: 1199px)');
    const confirmationMessage = 'Are you sure you want to reset? Your changes will be lost.';
    let mermaidRenderTimer = null;
    let mermaidRenderVersion = 0;
    // default template
    const defaultInput = `# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
###### This is a Heading h6

## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__

_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
* Item 2a
* Item 2b
    * Item 3a
    * Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](/image/Markdown-mark.svg "This is a sample image.")

## Links

You may be using [Markdown Live Preview](https://markdownlivepreview.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

${"`"}${"`"}${"`"}
let message = 'Hello world';
alert(message);
${"`"}${"`"}${"`"}

## Mermaid diagrams
${"`"}${"`"}${"`"}mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Finish]
  B -->|No| D[Alternate]
${"`"}${"`"}${"`"}

## Inline code

This web site is using ${"`"}markedjs/marked${"`"}.
`;

    self.MonacoEnvironment = {
        getWorker() {
            return new Proxy({}, { get: () => () => { } });
        }
    }

    let setupEditor = () => {
        let editor = monaco.editor.create(document.querySelector('#editor'), {
            fontSize: 14,
            language: 'markdown',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            wordWrap: 'on',
            hover: { enabled: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            folding: false
        });

        editor.onDidChangeModelContent(() => {
            let changed = editor.getValue() != defaultInput;
            if (changed) {
                hasEdited = true;
            }
            let value = editor.getValue();
            convert(value);
            saveLastContent(value);
        });

        editor.onDidScrollChange((e) => {
            if (!scrollBarSync) {
                return;
            }

            const scrollTop = e.scrollTop;
            const scrollHeight = e.scrollHeight;
            const height = editor.getLayoutInfo().height;

            const maxScrollTop = scrollHeight - height;
            const scrollRatio = scrollTop / maxScrollTop;

            let previewElement = document.querySelector('#preview');
            let targetY = (previewElement.scrollHeight - previewElement.clientHeight) * scrollRatio;
            previewElement.scrollTo(0, targetY);
        });

        return editor;
    };

    // Returns null when the language is unknown or the code is too large.
    let renderHighlightedCode = (code, lang) => {
        const highlighted = highlightCode(code, lang);
        if (highlighted === null) {
            return null;
        }
        return `<pre><code class="hljs language-${escapeHtml(lang)}">${highlighted}\n</code></pre>\n`;
    };

    // Renders JSON found outside a code block, with a note when it is invalid.
    let renderJsonBlock = ({ valid, text, error }) => {
        const code = renderHighlightedCode(text, 'json')
            ?? `<pre><code class="language-json">${escapeHtml(text)}\n</code></pre>\n`;
        if (valid) {
            return code;
        }
        return `<div class="json-error">Invalid JSON: ${escapeHtml(error)}</div>\n${code}`;
    };

    const copyButtonTemplate = document.createElement('template');
    copyButtonTemplate.innerHTML = '<button type="button" class="code-copy-button" aria-label="Copy code" title="Copy code">'
        + '<svg class="icon-copy" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>'
        + '<svg class="icon-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>'
        + '</button>';

    // Puts a copy button beside each rendered block. The button sits outside the
    // <pre> so it does not scroll sideways with long lines.
    let addCopyButtons = (output) => {
        output.querySelectorAll('pre').forEach((pre) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            pre.replaceWith(wrapper);
            wrapper.append(pre, copyButtonTemplate.content.firstElementChild.cloneNode(true));
        });
    };

    // Web links open in a new tab so the editor stays open; "#" links still scroll in place.
    let openLinksInNewTab = (output) => {
        output.querySelectorAll('a[href]').forEach((link) => {
            if (link.getAttribute('href').startsWith('#') || !/^https?:$/.test(link.protocol)) {
                return;
            }
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
    };

    let createMarkedRenderer = () => {
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

    // Mermaid is about 1 MB, so it is only downloaded once a document has a diagram.
    let mermaidLoader = null;
    let loadMermaid = () => {
        mermaidLoader ??= import('mermaid').then((module) => module.default);
        return mermaidLoader;
    };

    let configureMermaid = (mermaid, theme) => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme,
            suppressErrorRendering: true,
        });
    };

    let showMermaidError = (element, error) => {
        const message = error && error.message ? error.message : 'Unable to render Mermaid chart.';
        element.classList.add('mermaid-error');
        element.textContent = `Mermaid render error: ${message}`;
    };

    let getMermaidTheme = () => {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
    };

    let renderMermaidDiagramsNow = async (theme = getMermaidTheme()) => {
        const outputElement = document.querySelector('#output');
        if (!outputElement) {
            return;
        }

        const version = ++mermaidRenderVersion;
        const elements = Array.from(outputElement.querySelectorAll('.mermaid'));
        if (elements.length === 0) {
            return;
        }

        let mermaid;
        try {
            mermaid = await loadMermaid();
        } catch (error) {
            // Try again next time (for example after a network problem).
            mermaidLoader = null;
            elements.forEach((element) => showMermaidError(element, error));
            return;
        }
        if (version !== mermaidRenderVersion) {
            return;
        }
        configureMermaid(mermaid, theme);

        for (const [index, element] of elements.entries()) {
            if (version !== mermaidRenderVersion) {
                return;
            }

            const source = element.dataset.mermaidSource || element.textContent;
            element.dataset.mermaidSource = source;
            element.classList.remove('mermaid-error');

            try {
                const renderId = `mermaid-${Date.now()}-${version}-${index}`;
                const { svg, bindFunctions } = await mermaid.render(renderId, source, element);
                if (version !== mermaidRenderVersion) {
                    return;
                }
                element.innerHTML = svg;
                if (typeof bindFunctions === 'function') {
                    bindFunctions(element);
                }
            } catch (error) {
                showMermaidError(element, error);
            }
        }
    };

    let scheduleMermaidRender = () => {
        if (mermaidRenderTimer) {
            clearTimeout(mermaidRenderTimer);
        }

        mermaidRenderTimer = setTimeout(() => {
            mermaidRenderTimer = null;
            renderMermaidDiagramsNow();
        }, 150);
    };

    let renderMermaidDiagrams = (theme) => {
        if (mermaidRenderTimer) {
            clearTimeout(mermaidRenderTimer);
            mermaidRenderTimer = null;
        }

        return renderMermaidDiagramsNow(theme);
    };

    let renderer = createMarkedRenderer();
    let previewSearch = null;
    let outline = null;

    // Render markdown text as html
    let convert = (markdown) => {
        // marked.lexer/parser use these options as given (unlike marked.parse, which
        // merges them), so start from the defaults to keep GFM tables, task lists, etc.
        let options = {
            ...marked.defaults,
            renderer
        };
        // A document that is entirely JSON (such as an opened .json file) skips
        // Markdown parsing, so blank lines or indentation inside it still work.
        let json = detectJson(markdown);
        let html;
        if (json) {
            html = renderJsonBlock(json);
        } else {
            // Same as marked.parse, split in two so heading lines can be added in between.
            let source = markdown.replace(/\r\n?/g, '\n');
            let tokens = marked.lexer(source, options);
            markHeadingLines(source, tokens);
            html = marked.parser(tokens, options);
        }
        let sanitized = DOMPurify.sanitize(html);
        let output = document.querySelector('#output');
        output.innerHTML = sanitized;
        addCopyButtons(output);
        openLinksInNewTab(output);
        scheduleMermaidRender();
        previewSearch?.refresh();
        outline?.refresh();
    };

    // Reset input text
    let reset = () => {
        let changed = editor.getValue() != defaultInput;
        if (hasEdited || changed) {
            var confirmed = window.confirm(confirmationMessage);
            if (!confirmed) {
                return;
            }
        }
        presetValue(defaultInput);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });
    };

    let presetValue = (value) => {
        editor.setValue(value);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        hasEdited = false;
    };

    // ----- sync scroll position -----

    let initScrollBarSync = (settings) => {
        let checkbox = document.querySelector('#sync-scroll-checkbox');
        checkbox.checked = settings;
        scrollBarSync = settings;

        checkbox.addEventListener('change', (event) => {
            let checked = event.currentTarget.checked;
            scrollBarSync = checked;
            saveScrollBarSettings(checked);
        });
    };

    // ----- view mode (editor only / both / preview only) -----

    // Phones and larger screens remember their own mode, so picking the preview
    // on a phone does not turn off the side-by-side view on a laptop.
    let initViewMode = () => {
        const container = document.querySelector('#container');
        const buttons = document.querySelectorAll('#view-modes [data-view]');

        let applyViewMode = () => {
            const mode = loadViewMode(phoneQuery.matches);
            container.classList.remove('view-editor', 'view-split', 'view-preview');
            container.classList.add(`view-${mode}`);
            buttons.forEach((button) => {
                button.setAttribute('aria-pressed', String(button.dataset.view === mode));
            });
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                saveViewMode(button.dataset.view, phoneQuery.matches);
                applyViewMode();
            });
        });
        // Rotating a phone or resizing a window can cross the phone width.
        phoneQuery.addEventListener('change', applyViewMode);
        applyViewMode();
    };

    // ----- preview CSS loader (switch github-markdown css) -----
    const PREVIEW_CSS_LIGHT = 'css/github-markdown-light.css?v=a1a198514565';
    const PREVIEW_CSS_DARK = 'css/github-markdown-dark_dimmed.css?v=5d3f5d9d207c';

    let setPreviewCss = (useDark) => {
        const link = document.getElementById('gh-markdown-link');
        const desired = useDark ? PREVIEW_CSS_DARK : PREVIEW_CSS_LIGHT;
        if (!link) {
            const newLink = document.createElement('link');
            newLink.id = 'gh-markdown-link';
            newLink.rel = 'stylesheet';
            newLink.href = desired;
            document.head.appendChild(newLink);
            return new Promise((resolve) => {
                newLink.addEventListener('load', resolve, { once: true });
                newLink.addEventListener('error', resolve, { once: true });
            });
        }

        if (link.getAttribute('href') === desired) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
            link.setAttribute('href', desired);
        });
    };

    // ----- theme toggle (dark/light) -----
    let setTheme = (enabled) => {
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    };

    let initThemeToggle = (settings) => {
        let checkbox = document.querySelector('#theme-checkbox');
        if (!checkbox) return;
        checkbox.checked = settings;
        setTheme(settings);

        // set Monaco editor theme to match page theme
        if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
            monaco.editor.setTheme(settings ? 'vs-dark' : 'vs');
        }
        // set preview css to match theme
        setPreviewCss(settings);

        checkbox.addEventListener('change', (event) => {
            let checked = event.currentTarget.checked;
            setTheme(checked);
            saveThemeSettings(checked);
            setPreviewCss(checked);
            if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
                monaco.editor.setTheme(checked ? 'vs-dark' : 'vs');
            }
            renderMermaidDiagrams();
        });
    };

    // ----- clipboard utils -----

    let copyToClipboard = (text, successHandler, errorHandler) => {
        navigator.clipboard.writeText(text).then(
            () => {
                successHandler();
            },

            () => {
                errorHandler();
            }
        );
    };

    // Swaps the Copy icon for a check mark for a second.
    let flashCopied = (button, title) => {
        let link = button.querySelector("a");
        button.classList.add("copied");
        link.title = "Copied!";
        setTimeout(() => {
            button.classList.remove("copied");
            link.title = title;
        }, 1000);
    };

    let notifyCopied = () => {
        flashCopied(document.querySelector("#copy-button"), "Copy");
    };

    // ----- notice (short messages at the top of the page) -----

    let noticeTimer = null;

    // Messages without buttons close after 4 seconds; with buttons, they stay until one is clicked.
    let showNotice = (message, actions = []) => {
        const notice = document.querySelector('#notice');
        clearTimeout(noticeTimer);
        const text = document.createElement('span');
        text.textContent = message;
        const buttons = actions.map(({ label, onClick }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.addEventListener('click', () => {
                notice.hidden = true;
                onClick();
            });
            return button;
        });
        notice.replaceChildren(text, ...buttons);
        notice.hidden = false;
        if (actions.length === 0) {
            noticeTimer = setTimeout(() => {
                notice.hidden = true;
            }, 4000);
        }
    };

    // ----- share by link -----

    let setupShareButton = (editor) => {
        const button = document.querySelector('#share-button');
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const text = editor.getValue();
            if (!text.trim()) {
                showNotice('Nothing to share yet.');
                return;
            }
            const url = `${location.origin}${location.pathname}${SHARE_PREFIX}${await encodeShare(text)}`;
            if (url.length > MAX_LINK) {
                showNotice('This document is too large to share as a link.');
                return;
            }
            copyToClipboard(url, () => {
                flashCopied(button, 'Copy share link');
                showNotice(url.length > LONG_LINK
                    ? `Link copied, but it's long (${url.length.toLocaleString()} characters); some chat apps may cut it off.`
                    : 'Share link copied.');
            }, () => {
                showNotice("Couldn't copy the link.");
            });
        });
    };

    // Opens a "#share=" link: the shared text replaces the editor's, and the
    // user's own text is kept so it can be restored.
    let openSharedLink = async () => {
        if (!location.hash.startsWith(SHARE_PREFIX)) {
            return;
        }
        const data = location.hash.slice(SHARE_PREFIX.length);
        // Drop the data from the address so a reload does not import it again.
        history.replaceState(null, '', location.pathname + location.search);

        let text;
        try {
            text = await decodeShare(data);
        } catch {
            showNotice('This share link is broken or incomplete.');
            return;
        }

        const own = editor.getValue();
        if (own === text) {
            showNotice('This shared document is already open.');
            return;
        }
        // Keep the oldest backup, so opening a second link never replaces the user's own text.
        if (typeof loadBeforeShare() !== 'string') {
            saveBeforeShare(own);
        }
        presetValue(text);
        showNotice('Opened a shared document. Your own text was saved.', [
            {
                label: 'Restore my text',
                onClick: () => {
                    const backup = loadBeforeShare();
                    deleteBeforeShare();
                    if (typeof backup === 'string') {
                        presetValue(backup);
                    }
                }
            },
            { label: 'Keep this', onClick: deleteBeforeShare }
        ]);
    };

    // ----- export preview -----

    let restoreMermaidThemeAfterPrint = (theme) => {
        const printMedia = window.matchMedia('print');
        let printSessionStarted = false;

        const cleanup = () => {
            printMedia.removeEventListener('change', handlePrintMediaChange);
        };

        const handlePrintMediaChange = (event) => {
            if (event.matches) {
                printSessionStarted = true;
                return;
            }

            if (!printSessionStarted) {
                return;
            }

            cleanup();
            renderMermaidDiagrams(theme);
        };

        printMedia.addEventListener('change', handlePrintMediaChange);
        return cleanup;
    };

    let exportPreviewToPdf = () => {
        const currentTheme = getMermaidTheme();
        const printTheme = 'default';

        const cleanupPrintThemeListener = currentTheme === 'dark'
            ? restoreMermaidThemeAfterPrint(currentTheme)
            : null;

        renderMermaidDiagrams(printTheme).then(() => {
            window.print();
        }).catch((error) => {
            console.error('Failed to prepare PDF export', error);
            if (currentTheme === 'dark') {
                cleanupPrintThemeListener();
                renderMermaidDiagrams(currentTheme);
            }
            window.alert('Unable to prepare the print preview. Please try again.');
        });
    };

    // ----- setup -----

    // setup navigation actions
    let setupOpenButton = () => {
        const button = document.querySelector('#open-button');
        const input = document.querySelector('#open-file-input');

        button.addEventListener('click', () => {
            input.click();
        });

        input.addEventListener('change', async () => {
            const file = input.files[0];
            // Allow the same file to be selected again, including after a failed read.
            input.value = '';
            if (!file) return;

            button.disabled = true;
            let content;
            try {
                content = await file.text();
            } catch {
                window.alert('Unable to read this file. Please try again.');
                return;
            } finally {
                button.disabled = false;
            }

            presetValue(content);
            document.querySelector('#preview').scrollTo({ top: 0 });
        });
    };

    // Search icon for phones and tablets (no Ctrl+F): searches the preview when it
    // is showing, otherwise opens the editor's own search box.
    let setupSearchButton = (editor) => {
        document.querySelector('#search-button').addEventListener('click', () => {
            if (getComputedStyle(document.querySelector('#preview')).display !== 'none') {
                previewSearch.open();
            } else {
                editor.focus();
                editor.getAction('actions.find')?.run();
            }
        });
    };

    let setupResetButton = () => {
        document.querySelector("#reset-button").addEventListener('click', (event) => {
            event.preventDefault();
            reset();
        });
    };

    let setupCopyButton = (editor) => {
        document.querySelector("#copy-button").addEventListener('click', (event) => {
            event.preventDefault();
            let value = editor.getValue();
            copyToClipboard(value, () => {
                notifyCopied();
            },
                () => {
                    // nothing to do
                });
        });
    };

    // One listener for every block's copy button, since the preview is rebuilt on each edit.
    let setupCodeCopyButtons = () => {
        document.querySelector('#output').addEventListener('click', (event) => {
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

    let setupExportButton = () => {
        const exportButton = document.querySelector('#export-button');
        if (!exportButton) {
            return;
        }
        exportButton.addEventListener('click', (event) => {
            event.preventDefault();
            exportPreviewToPdf();
        });
    };

    // ----- local state -----

    let loadLastContent = () => {
        let lastContent = Storehouse.getItem(localStorageNamespace, localStorageKey);
        return lastContent;
    };

    let saveLastContent = (content) => {
        let expiredAt = new Date(2099, 1, 1);
        try {
            Storehouse.setItem(localStorageNamespace, localStorageKey, content, expiredAt);
        } catch {
            // Large files can exceed the browser's storage limit; the preview still works.
        }
    };

    let loadScrollBarSettings = () => {
        let lastContent = Storehouse.getItem(localStorageNamespace, localStorageScrollBarKey);
        return lastContent;
    };

    let loadThemeSettings = () => {
        let last = Storehouse.getItem(localStorageNamespace, localStorageThemeKey);
        if (last === null || last === undefined) {
            try {
                // fallback to raw localStorage boot key used by inline script
                const raw = localStorage.getItem('com.markdownlivepreview_theme');
                if (raw === 'dark') return true;
                if (raw === 'light') return false;
            } catch {
                // ignore
            }
        }
        return last;
    };

    let saveScrollBarSettings = (settings) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageScrollBarKey, settings, expiredAt);
    };

    // Phones have no side-by-side mode: they default to the editor.
    let loadViewMode = (phone) => {
        let mode = Storehouse.getItem(localStorageNamespace, phone ? localStorageViewModePhoneKey : localStorageViewModeKey);
        if (mode === 'editor' || mode === 'preview') {
            return mode;
        }
        return phone ? 'editor' : 'split';
    };

    let saveViewMode = (mode, phone) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, phone ? localStorageViewModePhoneKey : localStorageViewModeKey, mode, expiredAt);
    };

    let loadOutlineOpen = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageOutlineKey) === true;
    };

    let loadBeforeShare = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageBeforeShareKey);
    };

    let saveBeforeShare = (text) => {
        let expiredAt = new Date(2099, 1, 1);
        try {
            Storehouse.setItem(localStorageNamespace, localStorageBeforeShareKey, text, expiredAt);
        } catch {
            // Storage full: the shared document still opens.
        }
    };

    let deleteBeforeShare = () => {
        Storehouse.deleteItem(localStorageNamespace, localStorageBeforeShareKey);
    };

    let saveOutlineOpen = (open) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageOutlineKey, open, expiredAt);
    };

    let saveThemeSettings = (settings) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageThemeKey, settings, expiredAt);
        try {
            localStorage.setItem('com.markdownlivepreview_theme', settings ? 'dark' : 'light');
        } catch {
            // ignore storage errors
        }
    };

    let setupDivider = () => {
        let lastLeftRatio = 0.5;
        const divider = document.getElementById('split-divider');
        const leftPane = document.getElementById('edit');
        const rightPane = document.getElementById('preview');
        const container = document.getElementById('container');

        let isDragging = false;

        // Pointer events, so the divider can be dragged with a mouse, a finger or a pen.
        divider.addEventListener('pointerenter', () => {
            divider.classList.add('hover');
        });

        divider.addEventListener('pointerleave', () => {
            if (!isDragging) {
                divider.classList.remove('hover');
            }
        });

        divider.addEventListener('pointerdown', (e) => {
            isDragging = true;
            // Keep receiving moves even when the pointer leaves the thin divider.
            divider.setPointerCapture(e.pointerId);
            divider.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        divider.addEventListener('dblclick', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const halfWidth = (totalWidth - dividerWidth) / 2;

            leftPane.style.width = halfWidth + 'px';
            rightPane.style.width = halfWidth + 'px';
        });

        divider.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const offsetX = e.clientX - containerRect.left;
            const dividerWidth = divider.offsetWidth;

            // Prevent overlap or out-of-bounds
            const minWidth = 100;
            const maxWidth = totalWidth - minWidth - dividerWidth;
            const leftWidth = Math.max(minWidth, Math.min(offsetX, maxWidth));
            leftPane.style.width = leftWidth + 'px';
            rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
            lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
        });

        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('active');
                divider.classList.remove('hover');
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            }
        };
        divider.addEventListener('pointerup', endDrag);
        divider.addEventListener('pointercancel', endDrag);

        window.addEventListener('resize', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const availableWidth = totalWidth - dividerWidth;

            const newLeft = availableWidth * lastLeftRatio;
            const newRight = availableWidth * (1 - lastLeftRatio);

            leftPane.style.width = newLeft + 'px';
            rightPane.style.width = newRight + 'px';
        });
    };

    // ----- entry point -----
    let lastContent = loadLastContent();
    let editor = setupEditor();
    // Narrower line numbers on phones leave more room for text.
    let fitEditorToScreen = () => {
        editor.updateOptions({ lineNumbersMinChars: phoneQuery.matches ? 3 : 5 });
    };
    fitEditorToScreen();
    phoneQuery.addEventListener('change', fitEditorToScreen);
    if (typeof lastContent === 'string') {
        presetValue(lastContent);
    } else {
        presetValue(defaultInput);
    }
    setupOpenButton();
    previewSearch = setupPreviewSearch({
        output: document.querySelector('#output'),
        scroller: document.querySelector('#preview')
    });
    outline = setupOutline({
        panel: document.querySelector('#outline-panel'),
        toggle: document.querySelector('#outline-button'),
        backdrop: document.querySelector('#outline-backdrop'),
        output: document.querySelector('#output'),
        preview: document.querySelector('#preview'),
        editorPane: document.querySelector('#edit'),
        editor,
        isOverlay: () => drawerQuery.matches,
        // As a drawer it would cover the content, so it starts closed there.
        initiallyOpen: loadOutlineOpen() && !drawerQuery.matches,
        onOpenChange: (open) => {
            if (drawerQuery.matches) {
                return; // Drawer use doesn't change the laptop preference.
            }
            saveOutlineOpen(open);
            // The panel changes the panes' space; the divider recalculates on resize.
            window.dispatchEvent(new Event('resize'));
        }
    });
    setupSearchButton(editor);
    setupResetButton();
    setupCopyButton(editor);
    setupCodeCopyButtons();
    setupShareButton(editor);
    setupExportButton();

    let scrollBarSettings = loadScrollBarSettings() || false;
    initScrollBarSync(scrollBarSettings);
    initViewMode();

    // initialize theme (dark/light)
    let themeSettings = loadThemeSettings();
    // normalize to boolean (Storehouse may return string or boolean)
    if (themeSettings === 'true' || themeSettings === true) {
        themeSettings = true;
    } else {
        themeSettings = false;
    }
    initThemeToggle(themeSettings);

    setupDivider();

    openSharedLink();
    window.addEventListener('hashchange', openSharedLink);

    // Offline support (production builds only). A new version waits for the user
    // to reload; the text is saved on every edit, so reloading loses nothing.
    const updateServiceWorker = registerSW({
        onNeedRefresh() {
            showNotice('A new version is available.', [
                { label: 'Reload', onClick: () => updateServiceWorker(true) },
                { label: 'Later', onClick: () => {} }
            ]);
        },
        onOfflineReady() {
            showNotice('Ready to work offline.');
        }
    });
};

window.addEventListener("load", () => {
    init();
});
