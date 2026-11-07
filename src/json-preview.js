const CLOSERS = { '{': '}', '[': ']' };

const isJsonWhitespace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

const skipWhitespace = (text, index) => {
    while (index < text.length && isJsonWhitespace(text[index])) {
        index++;
    }
    return index;
};

// Decides whether text that failed to parse was meant to be JSON, so ordinary
// Markdown such as "[TODO] fix [later]" or "{{ template }}" is not flagged.
const looksLikeJson = (text) => {
    if (text[0] === '{') {
        return text.includes(':');
    }
    const next = text[skipWhitespace(text, 1)];
    return next === '{' || next === '[' || next === '"';
};

// Re-indents valid JSON without parsing it, so large numbers and duplicate
// keys are kept exactly as written.
export const formatJson = (text, indent = '  ') => {
    let out = '';
    let depth = 0;
    const newline = () => '\n' + indent.repeat(depth);

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === '"') {
            let end = i + 1;
            while (end < text.length && text[end] !== '"') {
                end += text[end] === '\\' ? 2 : 1;
            }
            out += text.slice(i, end + 1);
            i = end;
        } else if (ch === '{' || ch === '[') {
            const next = skipWhitespace(text, i + 1);
            if (text[next] === CLOSERS[ch]) {
                out += ch + text[next];
                i = next;
            } else {
                depth++;
                out += ch + newline();
            }
        } else if (ch === '}' || ch === ']') {
            depth--;
            out += newline() + ch;
        } else if (ch === ',') {
            out += ',' + newline();
        } else if (ch === ':') {
            out += ': ';
        } else if (!isJsonWhitespace(ch)) {
            out += ch;
        }
    }
    return out;
};

// Returns null when the text is not JSON, otherwise { valid, text, error }.
// Valid one-line JSON comes back re-indented; anything else is kept as written.
export const detectJson = (text) => {
    const trimmed = text.trim();
    const closer = CLOSERS[trimmed[0]];
    if (!closer || trimmed[trimmed.length - 1] !== closer) {
        return null;
    }

    try {
        JSON.parse(trimmed);
    } catch (error) {
        if (!looksLikeJson(trimmed)) {
            return null;
        }
        return { valid: false, text: trimmed, error: error.message };
    }

    // Skip trivial values like "[1]" or "{}" that are more likely plain text.
    if (!/[",:\n]/.test(trimmed)) {
        return null;
    }

    const isOneLine = !trimmed.includes('\n');
    return { valid: true, text: isOneLine ? formatJson(trimmed) : trimmed };
};
