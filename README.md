# Markdown Live Preview

A Markdown and JSON editor with a live preview, based on [Markdown Live Preview](https://markdownlivepreview.com/) by Hideaki Tanabe.

Live site: https://markdown-live-preview-306.pages.dev/

## Features

- Live preview with GitHub styling, light and dark themes, and PDF export
- Code highlighting for about 20 languages, with a copy button on every code block
- JSON support: plain JSON is formatted and coloured, invalid JSON is flagged, and `.json` files can be opened
- Mermaid diagrams
- Search in the editor and the preview (Ctrl+F, or the search icon on phones and tablets)
- Outline of the document's headings, which jumps to a section in both panes
- View modes: editor only, both panes, or preview only
- Share links: the whole document is packed into the link, and nothing is stored on a server
- Works offline and can be installed as an app
- Responsive layout for phones, tablets and laptops

Your text is saved in your browser's local storage and never leaves your device.

## Development

Requires Node.js 18 or newer.

```
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:5173
npm run build      # build the site into dist/
npm run preview    # serve the built site at http://localhost:4173
```

The `Makefile` has shortcuts for the same commands (`make setup`, `make dev`, `make build`).

Offline support only runs in a built version (`npm run build`, then `npm run preview`), not on the dev server.

## Deployment

The site is deployed to Cloudflare Pages from the `main` branch: every push to `main` builds (`npm run build`, output folder `dist`) and goes live automatically.

## License

MIT. See the [LICENSE](LICENSE) file.
