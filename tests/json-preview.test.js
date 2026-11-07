import { describe, expect, it } from 'vitest';
import { detectJson, formatJson } from '../src/lib/json-preview.js';

describe('detectJson', () => {
    it('keeps multi-line JSON exactly as written', () => {
        const text = '{\n    "name": "Alice",\n    "tags": ["a", "b"]\n}';
        expect(detectJson(text)).toEqual({ valid: true, text });
    });

    it('re-indents one-line JSON without changing values', () => {
        const result = detectJson('{"id":12345678901234567890,"s":"a, b: {c}","q":"say \\"hi\\"","e":[],"o":{}}');
        expect(result.valid).toBe(true);
        expect(result.text).toBe([
            '{',
            '  "id": 12345678901234567890,',
            '  "s": "a, b: {c}",',
            '  "q": "say \\"hi\\"",',
            '  "e": [],',
            '  "o": {}',
            '}'
        ].join('\n'));
    });

    it('flags invalid JSON with the parse error', () => {
        const result = detectJson('{\n  "a": 1,\n}');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/JSON/);
        expect(result.text).toBe('{\n  "a": 1,\n}');
    });

    it.each([
        ["{'a': 1}"],
        ['[{"a":1},]']
    ])('flags JSON-looking text %s as invalid', (text) => {
        expect(detectJson(text).valid).toBe(false);
    });

    it.each([
        ['[TODO] x [y]'],
        ['{{ template }}'],
        ['[1] note'],
        ['[1]'],
        ['{}'],
        ['[]'],
        ['[x]'],
        ['hello'],
        ['- [ ] task'],
        ['']
    ])('leaves ordinary text %j alone', (text) => {
        expect(detectJson(text)).toBeNull();
    });
});

describe('formatJson', () => {
    it('keeps empty objects and arrays on one line', () => {
        expect(formatJson('[]')).toBe('[]');
        expect(formatJson('{"a":{},"b":[]}')).toBe('{\n  "a": {},\n  "b": []\n}');
    });

    it('nests arrays and objects', () => {
        expect(formatJson('[1,{"x":null}]')).toBe('[\n  1,\n  {\n    "x": null\n  }\n]');
    });
});
