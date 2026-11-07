// Sync scroll: scrolling the editor scrolls the preview to the same relative position.
import { loadSyncScroll, saveSyncScroll } from '../storage.js';

export const setupSyncScroll = ({ editor, preview }) => {
    const checkbox = document.querySelector('#sync-scroll-checkbox');
    let enabled = loadSyncScroll();
    checkbox.checked = enabled;

    checkbox.addEventListener('change', (event) => {
        enabled = event.currentTarget.checked;
        saveSyncScroll(enabled);
    });

    editor.onDidScrollChange((e) => {
        if (!enabled) {
            return;
        }
        const maxScrollTop = e.scrollHeight - editor.getLayoutInfo().height;
        const ratio = e.scrollTop / maxScrollTop;
        preview.scrollTo(0, (preview.scrollHeight - preview.clientHeight) * ratio);
    });
};
