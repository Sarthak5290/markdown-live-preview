// Mermaid diagrams in the preview. Mermaid is about 1 MB, so it is only
// downloaded once a document has a diagram.
export const getDiagramTheme = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';

const showError = (element, error) => {
    const message = error && error.message ? error.message : 'Unable to render Mermaid chart.';
    element.classList.add('mermaid-error');
    element.textContent = `Mermaid render error: ${message}`;
};

export const createDiagrams = (output) => {
    let loader = null;
    let timer = null;
    // Each render gets a number; an older render stops when a newer one starts.
    let version = 0;

    const loadMermaid = () => {
        loader ??= import('mermaid').then((module) => module.default);
        return loader;
    };

    const renderNow = async (theme = getDiagramTheme()) => {
        const current = ++version;
        const elements = Array.from(output.querySelectorAll('.mermaid'));
        if (elements.length === 0) {
            return;
        }

        let mermaid;
        try {
            mermaid = await loadMermaid();
        } catch (error) {
            // Try again next time (for example after a network problem).
            loader = null;
            elements.forEach((element) => showError(element, error));
            return;
        }
        if (current !== version) {
            return;
        }
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme,
            suppressErrorRendering: true,
        });

        for (const [index, element] of elements.entries()) {
            if (current !== version) {
                return;
            }

            const source = element.dataset.mermaidSource || element.textContent;
            element.dataset.mermaidSource = source;
            element.classList.remove('mermaid-error');

            try {
                const renderId = `mermaid-${Date.now()}-${current}-${index}`;
                const { svg, bindFunctions } = await mermaid.render(renderId, source, element);
                if (current !== version) {
                    return;
                }
                element.innerHTML = svg;
                if (typeof bindFunctions === 'function') {
                    bindFunctions(element);
                }
            } catch (error) {
                showError(element, error);
            }
        }
    };

    return {
        // After each edit: wait for typing to pause.
        schedule: () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                renderNow();
            }, 150);
        },
        // Right away, optionally with a given theme (used for PDF export).
        render: (theme) => {
            clearTimeout(timer);
            timer = null;
            return renderNow(theme);
        }
    };
};
