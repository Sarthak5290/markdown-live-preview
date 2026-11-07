// Share by link: the Share icon copies a link with the document packed into it,
// and opening such a link shows that document while keeping the user's own text.
import { SHARE_PREFIX, LONG_LINK, MAX_LINK, encodeShare, decodeShare } from '../lib/share.js';
import { loadBeforeShare, saveBeforeShare, deleteBeforeShare } from '../storage.js';
import { copyToClipboard, flashCopied } from './clipboard.js';
import { showNotice } from './notice.js';

export const setupShareButton = (editor) => {
    const button = document.querySelector('#share-button');
    button.addEventListener('click', async (event) => {
        event.preventDefault();
        const text = editor.getValue();
        if (!text.trim()) {
            showNotice('Nothing to share yet.');
            return;
        }
        const url = `${location.origin}${location.pathname}${SHARE_PREFIX}${await encodeShare(text)}`;
        if (url.length > MAX_LINK) {
            showNotice('This document is too large to share as a link.');
            return;
        }
        copyToClipboard(url, () => {
            flashCopied(button, 'Copy share link');
            showNotice(url.length > LONG_LINK
                ? `Link copied, but it's long (${url.length.toLocaleString()} characters); some chat apps may cut it off.`
                : 'Share link copied.');
        }, () => {
            showNotice("Couldn't copy the link.");
        });
    });
};

// Opens the share link in the address bar, if there is one.
export const openSharedLink = async ({ editor, setDocument }) => {
    if (!location.hash.startsWith(SHARE_PREFIX)) {
        return;
    }
    const data = location.hash.slice(SHARE_PREFIX.length);
    // Drop the data from the address so a reload does not import it again.
    history.replaceState(null, '', location.pathname + location.search);

    let text;
    try {
        text = await decodeShare(data);
    } catch {
        showNotice('This share link is broken or incomplete.');
        return;
    }

    const own = editor.getValue();
    if (own === text) {
        showNotice('This shared document is already open.');
        return;
    }
    // Keep the oldest backup, so opening a second link never replaces the user's own text.
    if (typeof loadBeforeShare() !== 'string') {
        saveBeforeShare(own);
    }
    setDocument(text);
    showNotice('Opened a shared document. Your own text was saved.', [
        {
            label: 'Restore my text',
            onClick: () => {
                const backup = loadBeforeShare();
                deleteBeforeShare();
                if (typeof backup === 'string') {
                    setDocument(backup);
                }
            }
        },
        { label: 'Keep this', onClick: deleteBeforeShare }
    ]);
};
