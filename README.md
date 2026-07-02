# PesoTrack — Gold Master

Upload every file in this folder to the root of your GitHub Pages repository:

- index.html
- manifest.json
- sw.js
- icon-72.png, icon-96.png, icon-128.png, icon-144.png, icon-152.png,
  icon-192.png, icon-384.png, icon-512.png
- icon-maskable-192.png, icon-maskable-512.png

Then enable GitHub Pages from the repository Settings > Pages.

## Testing on PWABuilder.com
1. Deploy to GitHub Pages first (PWABuilder needs a live HTTPS URL — it
   can't scan local files).
2. Go to pwabuilder.com, paste your Pages URL, and click Start.
3. It should report a valid manifest, a registered service worker with
   offline support, and HTTPS — the three things it scores. See
   PWA_NOTES.md for what was specifically set up for this.
