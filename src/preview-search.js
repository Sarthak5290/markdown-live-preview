const MAX_MATCHES = 10_000;
const SEARCH_DELAY_MS = 100;
const hasHighlightApi = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Joins the preview's text nodes (skipping Mermaid diagrams) and remembers
// where each node starts, so a match can be mapped back to the DOM.
const indexText = (root) => {
    const nodes = [];
    const starts = [];
    let text = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.parentElement?.closest('.mermaid')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        nodes.push(node);
        starts.push(text.length);
        text += node.data;
    }
    return { nodes, starts, text };
};

// Index of the last text node that starts at or before the given position.
const findNode = (starts, position) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
        const mid = (low + high + 1) >> 1;
        if (starts[mid] <= position) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }
    return low;
};

const createRange = ({ nodes, starts }, start, end) => {
    const first = findNode(starts, start);
    const last = findNode(starts, end - 1);
    const range = document.createRange();
    range.setStart(nodes[first], start - starts[first]);
    range.setEnd(nodes[last], end - starts[last]);
    return range;
};

// Search box for the rendered preview. `scroller` is the scrolling pane that
// holds the search controls; `output` is the rendered content to search.
export const setupPreviewSearch = ({ output, scroller }) => {
    const box = scroller.querySelector('#preview-search');
    const input = scroller.querySelector('#preview-search-input');
    const count = scroller.querySelector('#preview-search-count');
    const caseToggle = scroller.querySelector('#preview-search-case');

    let matches = [];
    let capped = false;
    let current = -1;
    let matchCase = false;
    let searchTimer = null;
    let previewWasLastClicked = false;

    const clearHighlights = () => {
        if (hasHighlightApi) {
            CSS.highlights.delete('preview-search');
            CSS.highlights.delete('preview-search-current');
        }
    };

    const updateCount = () => {
        const hasQuery = input.value !== '';
        box.classList.toggle('no-results', hasQuery && matches.length === 0);
        if (!hasQuery) {
            count.textContent = '';
        } else if (matches.length === 0) {
            count.textContent = 'No results';
        } else {
            count.textContent = `${current + 1} of ${matches.length}${capped ? '+' : ''}`;
        }
    };

    const scrollToRange = (range) => {
        const rect = range.getBoundingClientRect();

        // Long lines in code blocks scroll sideways inside their <pre>.
        const pre = range.startContainer.parentElement?.closest('pre');
        if (pre && pre.scrollWidth > pre.clientWidth) {
            const preRect = pre.getBoundingClientRect();
            if (rect.left < preRect.left || rect.right > preRect.right) {
                pre.scrollLeft += rect.left - preRect.left - pre.clientWidth / 2;
            }
        }

        // Leave room for the search box at the top of the pane.
        const view = scroller.getBoundingClientRect();
        if (rect.top < view.top + 48 || rect.bottom > view.bottom - 16) {
            scroller.scrollTop += rect.top - view.top - scroller.clientHeight / 2;
        }
    };

    const showCurrent = (scroll) => {
        updateCount();
        if (current < 0) {
            return;
        }
        const range = matches[current];
        if (hasHighlightApi) {
            CSS.highlights.set('preview-search-current', new Highlight(range));
        } else {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
        if (scroll) {
            scrollToRange(range);
        }
    };

    const search = ({ keepPosition = false, scroll = true } = {}) => {
        const previous = current;
        matches = [];
        capped = false;
        current = -1;
        clearHighlights();

        if (input.value) {
            const index = indexText(output);
            const pattern = new RegExp(escapeRegExp(input.value), matchCase ? 'g' : 'gi');
            for (const match of index.text.matchAll(pattern)) {
                if (matches.length === MAX_MATCHES) {
                    capped = true;
                    break;
                }
                matches.push(createRange(index, match.index, match.index + match[0].length));
            }
        }

        if (matches.length > 0) {
            if (hasHighlightApi) {
                const highlight = new Highlight();
                matches.forEach((range) => highlight.add(range));
                CSS.highlights.set('preview-search', highlight);
            }
            current = keepPosition && previous >= 0 ? Math.min(previous, matches.length - 1) : 0;
        }
        showCurrent(scroll);
    };

    const runPendingSearch = () => {
        if (searchTimer === null) {
            return false;
        }
        clearTimeout(searchTimer);
        searchTimer = null;
        search();
        return true;
    };

    const move = (step) => {
        if (runPendingSearch() || matches.length === 0) {
            return;
        }
        current = (current + step + matches.length) % matches.length;
        showCurrent(true);
    };

    const open = () => {
        const selection = window.getSelection();
        const selected = selection ? selection.toString().trim() : '';
        if (selected && !selected.includes('\n') && output.contains(selection.anchorNode)) {
            input.value = selected;
        }
        box.hidden = false;
        input.focus();
        input.select();
        search();
    };

    const close = () => {
        clearTimeout(searchTimer);
        searchTimer = null;
        matches = [];
        current = -1;
        clearHighlights();
        box.hidden = true;
    };

    scroller.querySelector('#preview-search-close').addEventListener('click', close);
    scroller.querySelector('#preview-search-prev').addEventListener('click', () => move(-1));
    scroller.querySelector('#preview-search-next').addEventListener('click', () => move(1));

    caseToggle.addEventListener('click', () => {
        matchCase = !matchCase;
        caseToggle.setAttribute('aria-pressed', String(matchCase));
        search();
        input.focus();
    });

    input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchTimer = null;
            search();
        }, SEARCH_DELAY_MS);
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            move(event.shiftKey ? -1 : 1);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    });

    // Ctrl/Cmd+F opens this search when the preview was the last pane clicked.
    // Inside the editor, Monaco handles the shortcut first and opens its own box.
    document.addEventListener('pointerdown', (event) => {
        previewWasLastClicked = scroller.contains(event.target);
    }, true);

    document.addEventListener('keydown', (event) => {
        const isFind = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
            && event.key.toLowerCase() === 'f';
        if (isFind && !event.defaultPrevented && previewWasLastClicked) {
            event.preventDefault();
            open();
        }
    });

    return {
        // Called after every re-render; the old matches point at removed nodes.
        refresh: () => {
            if (!box.hidden) {
                search({ keepPosition: true, scroll: false });
            }
        },
        // For the search icon on touch screens, which have no Ctrl+F.
        open
    };
};
