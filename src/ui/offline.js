// Offline support (production builds only). A new version waits for the user to
// reload; the text is saved on every edit, so reloading loses nothing.
import { registerSW } from 'virtual:pwa-register';
import { showNotice } from './notice.js';

export const registerOffline = () => {
    const updateServiceWorker = registerSW({
        onNeedRefresh() {
            showNotice('A new version is available.', [
                { label: 'Reload', onClick: () => updateServiceWorker(true) },
                { label: 'Later', onClick: () => {} }
            ]);
        },
        onOfflineReady() {
            showNotice('Ready to work offline.');
        }
    });
};
