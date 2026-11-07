# ERO SOUND PAD — PWA repair package

## Upload to the existing GitHub repository

This package is intended to replace the files in the ROOT of the existing
`ero-sound-pad` repository. Do not upload the ZIP file itself.

Upload/replace these files:
- `index.html`
- `manifest.json`
- `service-worker.js`
- `app.js`
- `style.css`
- `icon-192.png`
- `icon-512.png`

Keep the repository Pages deployment on branch `main`, folder `/(root)`.

## Repairs included

- The actual Custom Design page is now the published `index.html`.
- Fixed the JavaScript path: the app script is stored at repository root.
- Manifest now references the two real PNG icons in the repository root.
- Added mobile/PWA icon metadata to the HTML.
- Fixed the Service Worker cache list to use real root paths.
- Service Worker cache installation no longer fails because one optional asset is missing.
- Service Worker updates use a new cache version and only clear older ERO SOUND PAD caches.
- Manifest requests standalone display and landscape orientation.

## Important limitations

- `orientation: landscape` is applied by supporting browsers when the PWA is installed
  and launched as an app. A normal Chrome tab cannot always be forced into landscape.
- Web MIDI availability varies by Android browser/device. The existing MIDI code is retained.
- The current app still uses generated demo tones, not recorded WAV sample kits.
  The four kit labels are not yet separate sample libraries.
- A GitHub Pages project must be served over HTTPS (GitHub Pages does this when enabled).

## After uploading

1. Commit the files to `main`.
2. Wait for GitHub Pages to publish.
3. Open the site in Chrome and refresh it.
4. If an old service worker is controlling the site, close the old tab and reopen.
5. Open Chrome menu → Install app. If the install option is still unavailable,
   check Chrome's site settings and clear the old site's stored data, then reload.
6. Launch from the installed ERO PAD icon and test landscape behavior.

The ZIP contains the complete replacement project files at its root.
