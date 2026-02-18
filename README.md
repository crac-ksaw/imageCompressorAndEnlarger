# PixelPad — Image Size Studio

Resize file size, not pixels. PixelPad is a fast, privacy‑first web app that compresses or enlarges images in your browser, with live previews and safe metadata padding. It also includes a dedicated PDF Studio for image↔PDF workflows and per‑page PDF exports.

## Features
- In‑browser processing (no uploads).
- Compress to a target size (KB/MB) with visual parity.
- Enlarge to a target size using safe metadata padding.
- Live before/after preview with size delta.
- Convert between JPG / PNG / WEBP / PDF.
- PDF Studio:
  - Image → PDF (single page).
  - PDF → PNG (per‑page export).

## How It Works
- **Compression** targets your desired file size; if the target is too small, PixelPad returns the smallest safe result and warns you.
- **Enlargement** pads the file with metadata so pixel data stays identical.
- **PDF tools** use a local copy of `pdf.js` for per‑page rendering, so it works offline.

## Run Locally
Just open `index.html` in a modern browser.

## GitHub Pages
1. Go to **Settings → Pages** in this repo.
2. Select **Deploy from a branch**.
3. Choose `main` and `/root`.
4. Save to get your live URL.

## Notes
- PNG compression is lossless; size reduction depends on the image content.
- PDF compression (without re‑rendering) is not supported.

## Project Structure
- `index.html` — UI
- `styles.css` — Styling
- `app.js` — Logic (compression, enlargement, conversion)
- `vendor/` — Local `pdf.js` bundle

---
Built for speed and privacy. Your files never leave the browser.
