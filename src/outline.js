const isShown = (element) => getComputedStyle(element).display !== 'none';

// Outline panel: lists the preview's headings (those tagged with data-source-line)
// and jumps to a heading in whichever panes are visible.
export const setupOutline = ({ panel, toggle, output, preview, editorPane, editor, initiallyOpen, onOpenChange }) => {
    const list = panel.querySelector('#outline-list');
    let headings = [];
    let items = [];
    let frame = null;

    // Marks the last heading that has scrolled past the top of the preview.
    const highlightCurrent = () => {
        frame = null;
        if (panel.hidden || items.length === 0) {
            return;
        }
        let current = -1;
        const scrolledToEnd = preview.scrollTop > 0
            && preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 2;
        if (isShown(preview) && scrolledToEnd) {
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

    const jumpTo = (index) => {
        const heading = headings[index];
        const line = Number(heading.dataset.sourceLine);
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
    };

    // Rebuilds the list from the current preview; skipped while the panel is closed.
    const refresh = () => {
        if (panel.hidden) {
            return;
        }
        headings = [...output.querySelectorAll('[data-source-line]')];
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
        toggle.setAttribute('aria-pressed', String(open));
        refresh();
    };

    toggle.addEventListener('click', () => {
        setOpen(panel.hidden);
        onOpenChange(!panel.hidden);
    });
    panel.querySelector('#outline-close').addEventListener('click', () => {
        setOpen(false);
        onOpenChange(false);
    });
    preview.addEventListener('scroll', () => {
        if (frame === null) {
            frame = requestAnimationFrame(highlightCurrent);
        }
    });

    setOpen(initiallyOpen);
    return { refresh };
};
