// Export PDF: diagrams are redrawn in the light theme for printing, then the
// browser's print dialog opens. In dark mode, the dark diagrams come back after.
import { getDiagramTheme } from '../preview/mermaid.js';

// Redraws the diagrams with `theme` once the print dialog has opened and closed.
const restoreThemeAfterPrint = (diagrams, theme) => {
    const printMedia = window.matchMedia('print');
    let printStarted = false;

    const cleanup = () => {
        printMedia.removeEventListener('change', handleChange);
    };

    const handleChange = (event) => {
        if (event.matches) {
            printStarted = true;
            return;
        }
        if (!printStarted) {
            return;
        }
        cleanup();
        diagrams.render(theme);
    };

    printMedia.addEventListener('change', handleChange);
    return cleanup;
};

export const exportPreviewToPdf = (diagrams) => {
    const currentTheme = getDiagramTheme();
    const cleanup = currentTheme === 'dark' ? restoreThemeAfterPrint(diagrams, currentTheme) : null;

    diagrams.render('default').then(() => {
        window.print();
    }).catch((error) => {
        console.error('Failed to prepare PDF export', error);
        if (currentTheme === 'dark') {
            cleanup();
            diagrams.render(currentTheme);
        }
        window.alert('Unable to prepare the print preview. Please try again.');
    });
};
