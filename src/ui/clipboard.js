export const copyToClipboard = (text, onSuccess, onError) => {
    navigator.clipboard.writeText(text).then(onSuccess, onError);
};

// Swaps a sidebar icon for a check mark for a second (Copy, Share).
export const flashCopied = (button, title) => {
    const link = button.querySelector('a');
    button.classList.add('copied');
    link.title = 'Copied!';
    setTimeout(() => {
        button.classList.remove('copied');
        link.title = title;
    }, 1000);
};
