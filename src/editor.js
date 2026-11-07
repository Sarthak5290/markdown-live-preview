// The Monaco editor: setup, theme, and narrower line numbers on phones.
import * as monaco from 'monaco-editor';

// Monaco's language workers aren't needed for Markdown; a stub stops it loading them.
self.MonacoEnvironment = {
    getWorker() {
        return new Proxy({}, { get: () => () => { } });
    }
};

export const createEditor = (element, { phoneQuery, onChange }) => {
    const editor = monaco.editor.create(element, {
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

    editor.onDidChangeModelContent(() => onChange(editor.getValue()));

    // Narrower line numbers on phones leave more room for text.
    const fitToScreen = () => {
        editor.updateOptions({ lineNumbersMinChars: phoneQuery.matches ? 3 : 5 });
    };
    fitToScreen();
    phoneQuery.addEventListener('change', fitToScreen);

    return editor;
};

export const setEditorTheme = (dark) => {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
};
