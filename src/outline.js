const isShown = (element) => getComputedStyle(element).display !== 'none';

// Outline panel: lists the preview's headings (those tagged with data-source-line)
// and jumps to a heading in whichever panes are visible. On small screens it is a
// drawer over the content (isOverlay), with a backdrop, and closes after a jump.
export const setupOutline = ({
    panel, toggle, backdrop, output, preview, editorPane, editor,
    initiallyOpen, onOpenChange, isOverlay = () => false
}) => {
    const list = panel.querySelector('#outline-list');
    let headings = [];
    let items = [];
    let frame = null;
    // The heading last clicked stays highlighted until the user scrolls, because
    // headings near the end of a document cannot scroll all the way to the top.
    let pinned = null;
    let pinnedAt = 0;

    // Marks the last heading that has scrolled past the top of the preview.
    const highlightCurrent = () => {
        frame = null;
        if (panel.hidden || items.length === 0) {
            return;
        }
        let current = -1;
        const scrolledToEnd = preview.scrollTop > 0
            && preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 2;
        if (pinned !== null) {
            current = pinned;
        } else if (isShown(preview) && scrolledToEnd) {
            // A short last section can never reach the top, so the end counts as it.
            current = headings.length - 1;
        } else if (isShown(preview)) {
            const top = preview.getBoundingClientRect().top + 16;
            current = 0;
            for (let i = 0; i < headings.length && headings[i].getBoundingClientRect().top <= top; i++) {
                current = i;
            }
        }
        items.forEach((item, i) => item.classList.toggle('current', i === current));
    };

    const scheduleHighlight = () => {
        if (frame === null) {
            frame = requestAnimationFrame(highlightCurrent);
        }
    };

    const unpin = () => {
        if (pinned !== null) {
            pinned = null;
            scheduleHighlight();
        }
    };

    const jumpTo = (index) => {
        const heading = headings[index];
        const line = Number(heading.dataset.sourceLine);
        pinned = index;
        pinnedAt = performance.now();
        highlightCurrent();
        if (isShown(editorPane)) {
            editor.revealLineNearTop(line);
            editor.setPosition({ lineNumber: line, column: 1 });
        }
        if (isShown(preview)) {
            // After the editor jump, so Sync scroll cannot pull the preview back.
            requestAnimationFrame(() => {
                const offset = heading.getBoundingClientRect().top - preview.getBoundingClientRect().top;
                preview.scrollTo({ top: preview.scrollTop + offset - 8, behavior: 'smooth' });
            });
        }
        // As a drawer it covers the content, so get out of the way after a jump.
        if (isOverlay()) {
            close();
        }
    };

    // Rebuilds the list from the current preview; skipped while the panel is closed.
    const refresh = () => {
        if (panel.hidden) {
            return;
        }
        headings = [...output.querySelectorAll('[data-source-line]')];
        if (pinned !== null && pinned >= headings.length) {
            pinned = null;
        }
        if (headings.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'outline-empty';
            empty.textContent = 'No headings';
            items = [];
            list.replaceChildren(empty);
            return;
        }

        const level = (heading) => Number(heading.tagName[1]);
        const topLevel = Math.min(...headings.map(level));
        items = headings.map((heading, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'outline-item';
            item.textContent = heading.textContent;
            item.title = heading.textContent;
            item.style.paddingLeft = `${12 + (level(heading) - topLevel) * 14}px`;
            item.addEventListener('click', () => jumpTo(index));
            return item;
        });
        list.replaceChildren(...items);
        highlightCurrent();
    };

    const setOpen = (open) => {
        panel.hidden = !open;
        backdrop.hidden = !open;
        toggle.setAttribute('aria-pressed', String(open));
        refresh();
    };

    const close = () => {
        setOpen(false);
        onOpenChange(false);
    };

    toggle.addEventListener('click', () => {
        setOpen(panel.hidden);
        onOpenChange(!panel.hidden);
    });
    panel.querySelector('#outline-close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden && isOverlay()) {
            close();
        }
    });
    preview.addEventListener('scroll', scheduleHighlight);

    // The user scrolling the preview (or the editor, which Sync scroll follows)
    // releases the clicked heading. The editor scroll caused by the jump itself is ignored.
    for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown']) {
        preview.addEventListener(type, unpin, { passive: true });
    }
    editor.onDidScrollChange(() => {
        if (performance.now() - pinnedAt > 500) {
            unpin();
        }
    });

    setOpen(initiallyOpen);
    return { refresh };
};
