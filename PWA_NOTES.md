# PWA readiness notes (for PWABuilder.com)

## Manifest
- Added `id`, `lang`, `dir`, `categories`, `display_override`,
  `prefer_related_applications` — fields PWABuilder checks for beyond the
  bare minimum.
- Full icon set: 72/96/128/144/152/192/384/512 for `purpose: "any"`, plus
  dedicated 192/512 `purpose: "maskable"` icons.
  Maskable icons are a **separate, full-bleed image** (no transparent
  rounded corners) with the ₱ mark kept inside the ~80% safe-zone circle,
  since Android/other platforms crop maskable icons to their own shape
  (circle, squircle, etc.) — reusing the transparent "any" icon for
  maskable would have gotten the ₱ mark clipped on some launchers.
- Added `shortcuts` (Add Transaction / Accounts / Reports) — long-press
  the installed app icon to jump straight to one of these. Wired up via
  a small `?action=` handler that runs after the app loads.

## Service worker
- Precaches the full icon set (was previously only caching 2 of them).
- Cache-first with network fallback, and falls back to the cached
  `index.html` app shell if a navigation request fails offline (this is
  a single-page app, so that shell handles all in-app routing itself).
- Cache name bumped with every meaningful update so installed users
  actually get new versions instead of a stale cached copy.

## Other tags
- Added `apple-touch-icon`, `apple-mobile-web-app-*`, and
  `msapplication-*` meta tags so install/home-screen behavior is correct
  on iOS and Windows too, not just Android/Chrome.
- Added a plain `<link rel="icon">` favicon and a `description` meta tag.

## What you may still want to do manually
- PWABuilder can optionally package a Windows/Android/iOS store build —
  that's a manual step on their site once the manifest/SW score is
  green.
- `screenshots` in the manifest (for a richer install prompt UI) weren't
  added since they need real captures of the deployed app — PWABuilder's
  own tools can generate/add these for you after you deploy.
