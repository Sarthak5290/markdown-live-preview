// Sidebar buttons: Open, Copy, Export PDF, Reset and the touch-screen Search icon.
// (Share, Outline, view modes, Sync scroll and Dark mode have their own modules.)
import { copyToClipboard, flashCopied } from './clipboard.js';
import { exportPreviewToPdf } from './export-pdf.js';

const RESET_CONFIRMATION = 'Are you sure you want to reset? Your changes will be lost.';

const setupOpenButton = (setDocument) => {
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

        setDocument(content);
        document.querySelector('#preview').scrollTo({ top: 0 });
    });
};

const setupCopyButton = (editor) => {
    const button = document.querySelector('#copy-button');
    button.addEventListener('click', (event) => {
        event.preventDefault();
        copyToClipboard(editor.getValue(), () => flashCopied(button, 'Copy'), () => {});
    });
};

const setupExportButton = (diagrams) => {
    document.querySelector('#export-button').addEventListener('click', (event) => {
        event.preventDefault();
        exportPreviewToPdf(diagrams);
    });
};

const setupResetButton = ({ editor, setDocument, isEdited, defaultDocument }) => {
    document.querySelector('#reset-button').addEventListener('click', (event) => {
        event.preventDefault();
        if (isEdited() || editor.getValue() !== defaultDocument) {
            if (!window.confirm(RESET_CONFIRMATION)) {
                return;
            }
        }
        setDocument(defaultDocument);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });
    });
};

// Search icon for phones and tablets (no Ctrl+F): searches the preview when it
// is showing, otherwise opens the editor's own search box.
const setupSearchButton = (editor, previewSearch) => {
    document.querySelector('#search-button').addEventListener('click', () => {
        if (getComputedStyle(document.querySelector('#preview')).display !== 'none') {
            previewSearch.open();
        } else {
            editor.focus();
            editor.getAction('actions.find')?.run();
        }
    });
};

export const setupToolbar = ({ editor, setDocument, isEdited, defaultDocument, previewSearch, diagrams }) => {
    setupOpenButton(setDocument);
    setupSearchButton(editor, previewSearch);
    setupResetButton({ editor, setDocument, isEdited, defaultDocument });
    setupCopyButton(editor);
    setupExportButton(diagrams);
};
