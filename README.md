# PDF A2Z

A privacy-first PDF tools website built with Next.js. Core processing is client-side.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

Push this folder to GitHub and import the repository into Vercel. No environment variables are required for the current version.

## Current tools

- Merge PDF
- Split PDF (first-page extraction in v1)
- Compress PDF (object-stream optimization)
- JPG/PNG to PDF
- PDF to JPG (UI placeholder; rendering engine will be added next)

## Roadmap

Add true PDF-to-JPG rendering, page-range split, drag/drop sorting, stronger compression presets, rotate, watermark, protect/unlock, OCR, and SEO landing pages.


## PDF Editor
Open `/editor` to upload a PDF, inspect its text/font metadata, select text, edit text, add text, remove selected text, and export a new PDF. Font detection uses PDF text metadata plus the browser Font Loading API. If a matching font is installed locally and detectable by the browser, it is shown as installed after refresh.

### Important implementation note
Browser-only PDF editing has an important limitation: reliably rewriting an existing PDF text object while preserving its original embedded font, kerning, encoding, and layout is not equivalent to Acrobat/Sejda. This MVP uses a visual text layer and exports edits as overlays. A production-grade editor can later add a WASM/native PDF engine for true in-place text editing and embedded-font preservation.
