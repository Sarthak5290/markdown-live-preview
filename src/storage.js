// Everything the app saves in the browser. The keys must not change, or people
// would lose their saved document and settings. storehouse-js stores each value
// under an MD5 hash of "namespace-key".
import Storehouse from 'storehouse-js';

const NAMESPACE = 'com.markdownlivepreview';
const KEYS = {
    content: 'last_state',
    syncScroll: 'scroll_bar_settings',
    theme: 'theme_settings',
    viewMode: 'view_mode',
    viewModePhone: 'view_mode_phone',
    outlineOpen: 'outline_open',
    beforeShare: 'before_share'
};
// A plain copy of the theme, read by the inline script in index.html before the app loads.
const BOOT_THEME_KEY = 'com.markdownlivepreview_theme';

const get = (key) => Storehouse.getItem(NAMESPACE, key);
const set = (key, value) => Storehouse.setItem(NAMESPACE, key, value, new Date(2099, 1, 1));

export const loadContent = () => get(KEYS.content);

export const saveContent = (content) => {
    try {
        set(KEYS.content, content);
    } catch {
        // Large files can exceed the browser's storage limit; the preview still works.
    }
};

export const loadSyncScroll = () => get(KEYS.syncScroll) || false;
export const saveSyncScroll = (enabled) => set(KEYS.syncScroll, enabled);

export const loadDarkTheme = () => {
    const saved = get(KEYS.theme);
    if (saved === null || saved === undefined) {
        try {
            const boot = localStorage.getItem(BOOT_THEME_KEY);
            if (boot === 'dark') return true;
            if (boot === 'light') return false;
        } catch {
            // Storage unavailable: fall back to light.
        }
    }
    // Older versions saved the setting as a string.
    return saved === 'true' || saved === true;
};

export const saveDarkTheme = (dark) => {
    set(KEYS.theme, dark);
    try {
        localStorage.setItem(BOOT_THEME_KEY, dark ? 'dark' : 'light');
    } catch {
        // Storage unavailable: the theme still applies for this visit.
    }
};

// Phones and larger screens each remember their own view mode. Phones have no
// side-by-side mode, so they default to the editor.
export const loadViewMode = (phone) => {
    const mode = get(phone ? KEYS.viewModePhone : KEYS.viewMode);
    if (mode === 'editor' || mode === 'preview') {
        return mode;
    }
    return phone ? 'editor' : 'split';
};
export const saveViewMode = (mode, phone) => set(phone ? KEYS.viewModePhone : KEYS.viewMode, mode);

export const loadOutlineOpen = () => get(KEYS.outlineOpen) === true;
export const saveOutlineOpen = (open) => set(KEYS.outlineOpen, open);

// The user's own text, kept while a shared document is open.
export const loadBeforeShare = () => get(KEYS.beforeShare);
export const saveBeforeShare = (text) => {
    try {
        set(KEYS.beforeShare, text);
    } catch {
        // Storage full: the shared document still opens.
    }
};
export const deleteBeforeShare = () => Storehouse.deleteItem(NAMESPACE, KEYS.beforeShare);
