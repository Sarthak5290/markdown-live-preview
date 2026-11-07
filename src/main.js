// App startup: creates the editor and the preview, then connects every feature.
// Styles first, so they come before the editor's own CSS, as before.
import './styles/base.css';
import './styles/sidebar.css';
import './styles/layout.css';
import './styles/preview.css';
import './styles/highlight.css';
import './styles/search.css';
import './styles/outline.css';
import './styles/notice.css';
import './styles/responsive.css';
import './styles/print.css';
import defaultDocument from './default-document.md?raw';
import { loadContent, saveContent, loadOutlineOpen, saveOutlineOpen } from './storage.js';
import { createEditor, setEditorTheme } from './editor.js';
import { createPreview } from './preview/render.js';
import { createDiagrams } from './preview/mermaid.js';
import { setupCodeCopyButtons } from './preview/code-blocks.js';
import { setupPreviewSearch } from './preview/preview-search.js';
import { setupOutline } from './ui/outline.js';
import { setupToolbar } from './ui/toolbar.js';
import { setupShareButton, openSharedLink } from './ui/share-link.js';
import { setupSyncScroll } from './ui/sync-scroll.js';
import { setupViewMode } from './ui/view-mode.js';
import { setupTheme } from './ui/theme.js';
import { setupDivider } from './ui/divider.js';
import { registerOffline } from './ui/offline.js';

// Phones show one pane at a time; below laptop width the outline is a drawer.
const phoneQuery = window.matchMedia('(max-width: 767px)');
const drawerQuery = window.matchMedia('(max-width: 1199px)');

const init = () => {
    const output = document.querySelector('#output');
    const preview = document.querySelector('#preview');
    let previewSearch = null;
    let outline = null;
    // Whether the user has typed since the document was last replaced (for Reset).
    let hasEdited = false;

    const diagrams = createDiagrams(output);
    const { render } = createPreview(output, () => {
        diagrams.schedule();
        previewSearch?.refresh();
        outline?.refresh();
    });

    const editor = createEditor(document.querySelector('#editor'), {
        phoneQuery,
        onChange: (value) => {
            if (value !== defaultDocument) {
                hasEdited = true;
            }
            render(value);
            saveContent(value);
        }
    });

    // Replaces the whole document (startup, opening a file, Reset, share links).
    const setDocument = (value) => {
        editor.setValue(value);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        hasEdited = false;
    };

    const saved = loadContent();
    setDocument(typeof saved === 'string' ? saved : defaultDocument);

    previewSearch = setupPreviewSearch({ output, scroller: preview });
    outline = setupOutline({
        panel: document.querySelector('#outline-panel'),
        toggle: document.querySelector('#outline-button'),
        backdrop: document.querySelector('#outline-backdrop'),
        output,
        preview,
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

    setupToolbar({ editor, setDocument, isEdited: () => hasEdited, defaultDocument, previewSearch, diagrams });
    setupCodeCopyButtons(output);
    setupShareButton(editor);
    setupSyncScroll({ editor, preview });
    setupViewMode(phoneQuery);
    setupTheme({ setEditorTheme, onChange: () => diagrams.render() });
    setupDivider();

    const openLink = () => openSharedLink({ editor, setDocument });
    openLink();
    window.addEventListener('hashchange', openLink);

    registerOffline();
};

window.addEventListener('load', init);
