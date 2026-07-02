# Design refresh notes

## What changed
- **Typography**: Manrope (UI/labels) + Fraunces (a serif used only for money
  figures — balances, totals, health score). This pairing is what gives the
  app its own identity instead of the generic rounded-sans "AI app" look.
- **Palette**: swapped the generic indigo/purple for a deep emerald
  (`--accent`) + warm brass/gold (`--accent-2`) pair — a more "wealth /
  banking" feel, distinct from typical fintech-template purple. Light mode
  uses a warm ivory background instead of cool white/lavender; dark mode
  uses a near-black ink base.
- **Hero card**: the dashboard's main balance card and the bottom nav are
  now treated as dark "metal card" surfaces (like a physical premium card),
  regardless of light/dark mode — the single strongest visual signature of
  the redesign.
- **Navigation**: rebuilt as icon+label (custom line-icon SVGs, not emoji)
  on a dark pill, with a gold active state instead of a plain white bar.
- **Geometry**: card radii tightened slightly (28–34px → 20–22px) for a
  crisper, more "designed" feel rather than the previous very rounded/bubbly
  look.
- **Performance**: added font preconnect + `display=swap`, antialiased text
  rendering; no new JS, no added render work — the redesign is CSS/markup
  only, so app logic and performance characteristics are unchanged.

## What did NOT change
- No JavaScript logic was touched — all functionality, data handling, and
  the earlier bug fixes (billing period + backup restore) are untouched.
- No element IDs, class names, or onclick handlers were removed — only the
  static bottom-nav markup was rebuilt (icons added) and a font link added
  to `<head>`. Everything else is additive CSS layered on top, following
  the same override pattern the app already used for its earlier design
  passes.

## Account creation: pick a known bank, type any name
The Add/Edit Account sheet no longer limits you to a fixed dropdown.
Instead:
- A grid shows 12 well-known Philippine banks/e-wallets (BPI, BDO,
  Metrobank, UnionBank, Maya, GCash, UnoBank, MP2 Pag-IBIG, GoTyme,
  MariBank, HSBC, Cash) plus one generic "Other" icon for anything else.
  Real bank logo artwork can't be reproduced (trademarks), so each is
  shown as its name in that bank's brand color — instantly recognizable
  without using their actual logo graphics.
- Tapping a known bank fills in the institution name for you; tapping
  "Other" just focuses the text field so you can type any custom name
  (a co-op, a foreign bank, a personal label, etc.).
- The name field stays fully editable afterward either way — e.g. you can
  keep the BPI color but rename it to "BPI - Payroll".
- Typing a recognized bank name by hand also auto-syncs the matching
  swatch, so the two stay in sync no matter which you use first.
- Existing accounts are unaffected: they keep their previous
  auto-assigned color until you edit them and pick a new one.

## Card color consistency pass
Every primary card/panel across the app (accounts, bills, budgets,
reports, calendar, settings, empty states, etc.) now shares one flat
surface color instead of the previous patchwork of slightly different
whites/off-whites and gradients. Nested "stat box" elements inside cards
(the small inset tiles like credit card stats or dashboard metric chips)
now share their own single consistent secondary tone, so there's still
clear visual hierarchy between a card and what's inside it — just no more
random shade variation between similar cards.

Left untouched on purpose: the dashboard hero, the "signature" insight
card, and the credit-card visual — these are intentionally dark accent
surfaces (styled like a physical premium card), not general content
cards, so they keep standing apart from the rest of the UI.

## Unified dark-emerald card system
Every card, panel, and sheet — accounts, bills, budgets, reports,
settings, the add-transaction/add-account sheets, empty states, all of
it — now uses the same dark emerald surface as the dashboard hero,
floating on the light page background. Text, borders, form fields, and
chips inside those cards automatically switch to light-on-dark styling
so everything stays readable. The hero, insight card, and credit-card
visual are effectively just the same treatment now too, so the whole
app reads as one consistent surface language instead of a few special
dark accents mixed into a mostly-white app.

## Important: cache bump
`sw.js`'s cache name was never changing between updates, so the app kept
serving an old cached copy even after you re-uploaded new files — that's
why the nav's "+" button and top-right icon still showed the old purple
in your screenshot even though the hero looked updated. The cache name
is now bumped to `v2`. After uploading this version, you may still need
to fully close and reopen the installed app (or clear site data /
reinstall it) once for the new service worker to take over — after that,
future updates will need their own cache-name bump too, or they'll get
stuck the same way.

## Fix: Accounts screen cards were still white
The Accounts screen (and a few other spots — search bar/timeline/setting
rows) render through a different card class (`.premiumAccountCard` /
`.premiumMini` / `.premiumBadge`, `.timelineItem`, `.settingRow`,
`.premiumTimelineItem`, `.softEmpty`) that the first pass of the unified
card system missed. These are now included, so the Accounts grid matches
the same dark emerald surface as everything else.

## True dark mode by default
The app now uses a dark palette everywhere by default — page background
included, not just cards. Previously the page background stayed a light
ivory with only cards in dark emerald; now the base background is near-
black with the same emerald cards elevated on top of it, and all text
tokens flip to light automatically. Status bar / splash screen colors in
manifest.json were updated to match. Cache bumped to v3 — close and
reopen the app once after uploading for it to take effect.

## Fixes after going dark-by-default
Flipping the base theme to dark surfaced a few spots that were tied to
the old assumption that "light mode" meant a light page:
- The bottom nav's background was pinned to `var(--text)`, which is now
  light — so the nav flipped to a light bar. Fixed to a fixed dark ink
  color that doesn't depend on the text token.
- The dashboard's four quick-action buttons (Expense/Transfer/Pay
  Card/Reports) were never included in the card system pass — fixed.
- The insight/signature cards used their own separate near-black tone
  that barely showed up against the new equally-dark page — brought them
  into the same emerald card family as everything else.
Cache bumped to v4.

## Readability fixes across Reports/Home
Several elements relied on a `body.dark` CSS class that was never actually
being toggled (we changed color tokens instead), so they stayed in their
original light styling even in the new dark-by-default theme — and a few
had light text that became invisible once the global text color flipped:
- "Financial Command Center" card and its 4 stat tiles — was a
  near-white glowing card with pale gold text on white; now dark emerald
  like everything else.
- Day/Week/Month/Year segmented control — was a light gray bar; now dark
  with a solid accent-colored active state.
- Spending heatmap cells — all 5 intensity levels recolored so every
  level (including empty days) stays readable, using accent-opacity steps
  instead of light indigo shades.
- Status pills ("No urgent alerts", "utilization is healthy", etc.) —
  these intentionally keep light pastel backgrounds (green/orange/red for
  good/warn/danger), but now use dark text instead of the new light
  default, since light-on-light was unreadable.
- "Financial Story" card — was still on the old navy/indigo gradient,
  never updated; now matches the emerald family.
- Income/Expense/Net progress bar track — was a hardcoded light gray,
  invisible against the dark page; now a translucent dark track.
Cache bumped to v5.

## Today's Pulse, 6-Month Cash Flow, Add Transaction
Same recurring bug pattern — these had their own separate hardcoded light
backgrounds that weren't covered by earlier passes:
- Today's Pulse: the Income/Expense/Transfer cells inside the card had
  their own light background, distinct from the card itself.
- 6-Month Cash Flow: the bar track behind each income/expense bar was
  light gray.
- Add Transaction: the amount display, the number pad keys, and the
  account/category picker buttons all had their own separate light
  backgrounds not covered by the card system.
Cache bumped to v6.

## Remaining pills + new app icon
- Fixed a mistake from the previous pass: "Covered" status pill had light
  text on its light mint background (I'd set it to match the dark-card
  pattern, but this pill intentionally keeps a light pastel background —
  reverted to dark green text).
- Cash Flow Forecast's "+₱0" delta pill, the account/category picker's
  "+" circle, and the Transfer Fee box + its input all had their own
  separate light backgrounds — fixed.
- New app icon: deep emerald gradient square, a thin gold ring (coin
  motif), and a bold gold ₱ mark — matches the app's actual color
  identity now instead of a generic default icon. Both 192 and 512 sizes
  regenerated.
Cache bumped to v7.

## Compact Add Transaction sheet
The Transfer form in particular (type tabs + 2 account pickers + fee box
+ note + amount + numpad + save button) was taller than one screen,
requiring scrolling to reach Save. Tightened padding, button heights, and
font sizes throughout the sheet, and hid the picker buttons' third line
of helper text (not essential once an account is chosen). Should now fit
on one screen for Expense, Income, and Transfer alike on typical phones.
Cache bumped to v8.
