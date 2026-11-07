// Kept separate from vite.config.mjs so tests don't run the site's build plugins
// (stylesheet versioning, offline service worker).
export default {
    test: {
        include: ['tests/**/*.test.js'],
        environment: 'node'
    }
};
