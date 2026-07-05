# OVERBRØD — website

A single-page site for OVERBRØD, a Scandinavian deli in Alexandra, Singapore,
with a built-in reservation form and a staff portal (booking management + menu
CMS). Built as plain HTML/CSS/JS — no framework, no build step — so it loads
fast on any device and deploys anywhere.

## Files

```
site/
├── index.html          Markup: hero, story, menu, reviews, reservation, visit, footer, portal
├── styles.css          All styling (art direction, responsive, reduced-motion)
├── app.js              Menu rendering, reservation flow, staff portal, menu CMS
├── design/
│   ├── tokens.css      Design tokens (CSS custom properties) — generated via the ui-toolkit skill
│   └── tokens.json     Token source of truth
├── STRATEGY.md         Phase 1 & 2: business intelligence + content strategy
└── README.md           This file
```

## Run locally

No build needed. Serve the folder with any static server:

```bash
cd site
python3 -m http.server 8099
# open http://localhost:8099
```

(Open via a server rather than `file://` so fonts and relative paths resolve.)

## Deploy

Upload the `site/` folder to any static host — Netlify, Vercel, Cloudflare
Pages, GitHub Pages, S3. There is no server component to configure.

## Brand assets

`assets/brand/` holds OVERBRØD's real logo (hand-drawn script wordmark, white
on black):

- `logo.png` — the original, opaque. Used as the **favicon** and the
  **Instagram avatar** (both expect a filled background; cropped to a circle
  via CSS for the avatar).
- `logo-mark.png` — the same artwork with the black background removed
  (alpha extracted from luminance, so it's a clean transparent white mark).
  Used as the small icon in the **nav** and **footer**, next to the existing
  typographic wordmark, so it sits cleanly on any of the site's dark surfaces
  without a blocky black square behind it. Hidden below 620px width (the
  wordmark's coloured Ø already carries the brand mark there; keeps the
  mobile nav from crowding the Reserve button).

## Design

Three directions were explored (dark luxury à la Carbone/Bavette's, Pacific
Northwest regional-modern à la Canlis, and a vintage chophouse à la El Gaucho)
before settling on a **hybrid**: the vintage chophouse palette and typography,
restrained with the Pacific Northwest direction's lighter touch.

- **Palette — "Ember & Sand"** — black bean (`#3D1202`), mahogany (`#BA3D03`),
  cadmium orange (`#E58423`), golf/golden-sand (`#E8C581`). Generated through
  the `ui-toolkit` skill (`npm run tokens:generate -- --palette overbrod-ember
  --fonts overbrod-chophouse-light`) into `design/tokens.css`; `styles.css` maps
  those flat roles onto semantic names, with black bean for the inverted
  "feature" surfaces (nav, hero, reviews, footer) and golden sand for the light
  ground. Built for gradients and candlelight rather than flat blocks: a warm
  top-light wash on the sand ground, a layered cadmium+mahogany glow behind the
  hero, an ember-gradient wordmark and buttons.
  - **Contrast is context-aware:** mahogany passes AA on the light sand but not
    on black bean, so the Nordic marks / accents switch to cadmium on dark
    surfaces. All text still meets WCAG AA (`--label` #8F2E02 on light,
    `--label-on-dark` #E58423 on dark).
- **Type** — Playfair Display (vintage chophouse serif) over EB Garamond, set
  at a lighter weight (560 vs. a typical bold chophouse 700–800) for a more
  regional-modern, less shouty read. Google Fonts (SIL OFL); falls back to
  Georgia / system-ui if the CDN is unreachable.
- **Vintage details, restrained** — a double-rule under each menu category
  heading (classic chophouse), but thinner and in a muted gold-brown rather
  than solid black; a quiet gold square bullet before section eyebrows
  (borrowed from the Pacific NW direction) instead of a heavier rule.
- **A Danish detail, not a steakhouse one** — every genuine Nordic letter (ø,
  å, æ) anywhere on the site — "Sm**ø**rrebr**ø**d," "Overbr**ø**d," the menu
  heading — carries the same accent-red tint as the logo's Ø (`.o-slash` in
  `styles.css`; applied to dynamic text via the `nordicMark()` helper in
  `app.js`). It's one graphic signature, extended as a coherent system across
  the real Danish content in the brief, rather than a second competing motif —
  the thing that keeps this feeling like a Danish deli rather than a chophouse
  with a Scandinavian menu bolted on.
- **Signature motion** — one considered moment: an orchestrated page-load
  reveal where the wordmark rises into view behind a mask and the tagline,
  actions and meta follow in sequence. No scroll-triggered animation.
  Disabled under `prefers-reduced-motion`; transform/opacity only for mobile
  smoothness; keyboard focus always visible.
- **Texture** — a light film-grain overlay (0.16 opacity — between the heavier
  vintage-chophouse grain and Pacific NW's near-absence of one) plus a warm
  gold radial "candlelight" behind the hero wordmark.
- **Hero film** — a deconstructed-smørrebrød (the Shooting Star) exploded-view
  film plays behind the wordmark: the plated dish separates into its layers
  (toast, egg, panko fish, herbed sauce, cured salmon, roe, dill). It plays
  once and rests on the exploded frame — one considered moment, no loop-snap.

  Assets in `assets/`: `hero-smorrebrod.webm` (1080p VP9, ~3.2MB) and
  `hero-smorrebrod.mp4` (1080p H.264, ~2.1MB) for cross-browser coverage, plus
  `hero-poster.jpg` (the assembled first frame, ~114KB). `initHeroVideo()` in
  `app.js` only injects the `<source>`s and autoplays on screens ≥768px without
  a `prefers-reduced-motion` preference — **mobile and reduced-motion visitors
  get the poster still only**, so nothing heavy downloads on a phone. The WebM
  source is listed first (Chrome/Firefox/Edge) with the MP4 as the Safari
  fallback; the browser plays the first it supports.

## Reservation form & staff portal

**Reservations** are written to the browser's `localStorage` as `pending`. The
form validates required fields, checks the date isn't in the past, and requires
explicit **PDPA** consent before submitting.

**Staff portal** — the "Staff login" link in the footer opens a password gate.

- Password: `OVERBRODSG`
- **Bookings tab** — filter by All / Pending / Confirmed / Cancelled; Accept
  (→ confirmed), Cancel (→ cancelled), Restore, or Delete each booking.
- **Menu tab** — full CRUD. Add / edit / delete items with name, price,
  category, image URL (or Ø placeholder), description, signature toggle,
  dietary tags, and an "Available in-store" toggle (hidden items drop off the
  public menu). Edits update the public menu immediately.

> **A real backend now exists.** `../overbrod-server` provides a secure API
> (server-side bookings, bcrypt staff auth with httpOnly sessions, email
> confirmation, rate limiting). When the site is served by that backend,
> `app.js` auto-detects it and uses the API — the staff password and PII no
> longer live in the browser. The behavior below is the **offline fallback**
> used only when the site is opened without the backend.

### ⚠️ Fallback (no backend): front-end-only demo of those features

Because the site is fully static, both the reservations and the menu edits live
in **`localStorage` on the device that made them** — a booking submitted on a
customer's phone is *not* visible in the staff portal on a different device, and
the `OVERBRODSG` password is checked in JavaScript, so it is **not real
security**. This is correct and useful for a demo or a single shared tablet at
the counter, but for live, multi-device operation you need a small backend:

- an API + database so bookings sync across devices,
- real authentication for staff (hashed credentials / SSO),
- an email/SMS confirmation to the customer.

The UI is structured so that swap is a contained change (replace the
`localStorage` load/save calls in `app.js` with API calls). Happy to build that
backend as a follow-up.

## Security & PDPA (Singapore)

**Not legal advice.** This is a good-faith technical + PDPA review, not a
lawyer's sign-off. Before going live with real customer data, have a
Singapore-qualified lawyer review it and make the owner decisions below.

**Hardening done in the static site:**
- **Content-Security-Policy** (via `<meta>` and `_headers`) with `script-src
  'self'` and no `'unsafe-inline'` for scripts — injected inline scripts can't
  run. Plus `_headers` for hosts that read it (Netlify/Cloudflare Pages):
  HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, COOP. Set the same headers in your
  server config if your host doesn't read `_headers`.
- **XSS:** every piece of user/CMS input is HTML-escaped before rendering;
  the menu image field is restricted to `http(s)`/`data:image` URLs.
- **External links:** `rel="noopener"`.
- **PDPA:** a `privacy.html` policy (template — fill DPO + dates), consent copy
  that covers withdrawal and access/correction/deletion, a link to the policy
  by the form and in the footer, and **automatic 60-day purge** of on-device
  booking data (retention limitation).
- **Booking delivery:** the form now actually reaches the deli — it opens a
  pre-filled email to `overbrodsg@gmail.com` (the reliable no-backend option),
  and the copy says so, instead of implying an automatic confirmation.

**Cannot be fixed without a backend / owner action (flagged, not resolved):**
- The staff-portal password lives in client-side JS — it is **not real
  security**; the portal should not ship on the public site without a real
  authenticated backend.
- Customer PII in `localStorage` can't be truly protected (browser extensions,
  shared/kiosk devices). A real booking system needs server-side storage,
  encryption in transit/at rest, and access control.
- PDPA **Protection** and **Data Breach Notification** obligations, and
  appointing a **DPO**, require organisational process + a backend.
- **Dietary/allergen tags are unverified guesses** — an incorrect "Nut-free"
  etc. is a food-safety and misrepresentation risk. The owner must verify every
  tag before relying on them.
- Replace the placeholder OG/canonical domain; consider self-hosting fonts to
  avoid sending visitor IPs to Google.

## Accessibility & performance

- **Contrast** — all text meets WCAG AA (≥4.5:1). Gold is used for decorative
  marks only; gold-colored *text* (eyebrows, dietary tags, labels) uses the
  accessible `--label` / `--label-on-dark` tokens instead of the lighter brand
  gold.
- **Keyboard** — skip-link, visible focus rings, `Esc` to close overlays, and a
  focus trap that keeps `Tab` within the open reservation/portal/menu dialogs
  and restores focus to the trigger on close.
- **Mobile nav** — a real hamburger menu (not hidden links): an accessible
  toggle (`aria-expanded` / `aria-controls`) reveals a dropdown of the section
  links; closes on link click or `Esc`.
- **Motion** — the one hero page-load reveal and hover micro-interactions are
  all disabled under `prefers-reduced-motion`; the hero film is never loaded on
  mobile or under reduced motion.
- **Meta** — title, description, canonical, Open Graph (incl. `og:image`), and
  Twitter card are set. ⚠️ They use a placeholder domain (`https://overbrod.sg/`)
  — replace it with the real deployed domain so canonical/OG resolve absolutely.

## Notes for the owner

- **Dietary tags are seeded conservatively.** Only tags we can infer safely are
  pre-filled; `Halal-friendly` is intentionally left unset (the kitchen serves
  pork). Review and correct every tag in the Menu tab before relying on them.
- **Menu images** are Ø placeholders until you add real photos — paste an image
  URL per item in the Menu editor. (The hero already uses the real
  deconstructed-smørrebrød film.)
- **Dish slider** (between Story and Instagram) is an immersive, morphing
  showcase of four signature smørrebrød. Each dish is a full-bleed colour
  panel with a big ghost name, the plated dish, floating garnish and its real
  menu copy; navigate with the arrows, dots, drag/swipe, or arrow keys. It
  renders the first dish with no JS and crossfades between them with it on.
  Assets live in `assets/slider/` — the four plated dishes (`roast-beef.png`,
  `salmon.png`, `shrimp.png`, `shooting-star.png`, cut out from the studio
  photos onto transparency and compressed to ~180 KB each) and six
  hand-drawn garnish PNGs in `assets/slider/garnish/` (dill, lemon, roe, pea
  shoot, rye crumb, pink peppercorn). To swap a dish later, replace the file
  at the same path and update the copy/`alt`/colour vars on that `<article
  class="dish">` in `index.html`.
- **Instagram gallery** (between the dish slider and Menu) is complete, using
  OVERBRØD's actual last 6 posts — a static, one-time snapshot that will
  *not* auto-update as new posts go up. Grid order: **video, photo, photo,
  photo, video, photo**. Nothing in the grid links to Instagram except the
  **Follow** button (`instagram.com/overbrod`); photos are inert, and each
  video shows a play button and swaps in a real `<video controls>` on click.
  All 6 assets in `assets/instagram/` (`video-1.mp4`/`.jpg`,
  `video-2.mp4`/`.jpg`, `1.jpg`…`4.jpg`) are the real content, resized for web
  (900px wide, ~80% JPEG quality). To swap any of them later (e.g. when
  OVERBRØD wants to refresh the snapshot), just replace the file at the same
  path and update its `alt` text in `index.html`.
