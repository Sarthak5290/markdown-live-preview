// Saves each top-level heading's line number (1-based) on its marked token as
// `sourceLine`. Tokens are found in order in the source, which also skips text
// marked leaves out of the token list (such as link definitions).
export const markHeadingLines = (source, tokens) => {
    let cursor = 0;
    for (const token of tokens) {
        const at = source.indexOf(token.raw, cursor);
        if (at === -1) {
            continue;
        }
        cursor = at + token.raw.length;
        if (token.type === 'heading') {
            token.sourceLine = source.slice(0, at).split('\n').length;
        }
    }
};
