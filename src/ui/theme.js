// Light/dark theme: the page, the editor, and the preview stylesheet.
import { loadDarkTheme, saveDarkTheme } from '../storage.js';

// The ?v= values are kept up to date by scripts/update-css-version.mjs (also in index.html).
const PREVIEW_CSS_LIGHT = 'css/github-markdown-light.css?v=a1a198514565';
const PREVIEW_CSS_DARK = 'css/github-markdown-dark_dimmed.css?v=5d3f5d9d207c';

// The inline script in index.html adds this link before the app loads, to avoid a flash.
const setPreviewCss = (dark) => {
    const link = document.getElementById('gh-markdown-link');
    const desired = dark ? PREVIEW_CSS_DARK : PREVIEW_CSS_LIGHT;
    if (!link) {
        const newLink = document.createElement('link');
        newLink.id = 'gh-markdown-link';
        newLink.rel = 'stylesheet';
        newLink.href = desired;
        document.head.appendChild(newLink);
        return;
    }
    if (link.getAttribute('href') !== desired) {
        link.setAttribute('href', desired);
    }
};

const applyTheme = (dark, setEditorTheme) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    setEditorTheme(dark);
    setPreviewCss(dark);
};

export const setupTheme = ({ setEditorTheme, onChange }) => {
    const checkbox = document.querySelector('#theme-checkbox');
    const dark = loadDarkTheme();
    checkbox.checked = dark;
    applyTheme(dark, setEditorTheme);

    checkbox.addEventListener('change', (event) => {
        const checked = event.currentTarget.checked;
        applyTheme(checked, setEditorTheme);
        saveDarkTheme(checked);
        onChange();
    });
};
