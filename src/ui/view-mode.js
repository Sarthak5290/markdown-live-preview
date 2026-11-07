// View modes: editor only, both panes, or preview only (sidebar icons).
// Phones and larger screens remember their own mode, so picking the preview on a
// phone does not turn off the side-by-side view on a laptop.
import { loadViewMode, saveViewMode } from '../storage.js';

export const setupViewMode = (phoneQuery) => {
    const container = document.querySelector('#container');
    const buttons = document.querySelectorAll('#view-modes [data-view]');

    const apply = () => {
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
            apply();
        });
    });
    // Rotating a phone or resizing a window can cross the phone width.
    phoneQuery.addEventListener('change', apply);
    apply();
};
