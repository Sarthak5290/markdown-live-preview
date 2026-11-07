import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'node_modules/', 'public/'] },
    js.configs.recommended,
    {
        // Site code runs in the browser.
        files: ['src/**/*.js'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } }
    },
    {
        // Tests, build scripts and config files run in Node.
        files: ['tests/**/*.js', 'scripts/**/*.mjs', '*.config.js', '*.config.mjs'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } }
    }
];
