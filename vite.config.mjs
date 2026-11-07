import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
import { cssFiles, updateCssVersions } from './scripts/update-css-version.mjs';

export default {
    plugins: [{
        name: 'update-css-versions',
        buildStart() {
            updateCssVersions();
        },
        configureServer(server) {
            server.watcher.add(cssFiles);
            server.watcher.on('change', path => {
                if (cssFiles.includes(resolve(path))) {
                    updateCssVersions();
                }
            });
        }
    },
    // Offline support: a service worker caches every built file, and the
    // manifest makes the site installable. Off on the dev server.
    VitePWA({
        registerType: 'prompt',
        workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,webp,ttf}'],
            // The main bundle (editor + preview) is about 4 MB.
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            // Stylesheets are linked as css/x.css?v=<hash>; match them without the "v".
            ignoreURLParametersMatching: [/^v$/, /^utm_/, /^fbclid$/],
            navigateFallback: 'index.html',
            cleanupOutdatedCaches: true
        },
        manifest: {
            name: 'Markdown Live Preview',
            short_name: 'MD Preview',
            description: 'Online Markdown editor with live preview.',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            theme_color: '#444444',
            background_color: '#ffffff',
            icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
            ]
        }
    })]
};
