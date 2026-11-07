import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const languages = {
    bash, c, cpp, csharp, css, diff, go, java, javascript, json, markdown,
    php, python, ruby, rust, shell, sql, typescript, xml, yaml
};

for (const [name, language] of Object.entries(languages)) {
    hljs.registerLanguage(name, language);
}

// Highlighting runs on every keystroke, so very large blocks are left plain.
export const MAX_HIGHLIGHT_CHARS = 200_000;

// Returns highlighted HTML (already escaped), or null when the language is
// unknown or the code is too large.
export const highlightCode = (code, lang) => {
    if (!lang || code.length > MAX_HIGHLIGHT_CHARS || !hljs.getLanguage(lang)) {
        return null;
    }
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
};
