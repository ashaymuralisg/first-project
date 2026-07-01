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

## Design — three switchable themes

The site ships with **three fully-realised visual identities**. Switch between
them with the control in the bottom-left of the page (choice persists in
`localStorage`). This is a preview control for choosing a direction — once one
is picked, the switcher and the unused themes can be removed in minutes.

| Theme | Vibe | Palette | Type |
|-------|------|---------|------|
| **Moody** | Dark luxury (Carbone / Bavette's) | near-black + oxblood + brass | Cormorant Garamond / Jost |
| **Pacific NW** | Regional modern (Canlis) | warm stone + forest green + wood | Newsreader / Figtree |
| **Chophouse** | Vintage steakhouse (El Gaucho) | cream + deep red + antique gold | Playfair Display / EB Garamond |

**How the theming works.** `styles.css` holds all structure and components and
references only *semantic* tokens (`--bg`, `--fg`, `--accent`, `--feature-bg`,
`--line`, …). `themes.css` sets those tokens per identity under
`[data-theme="…"]`, and `app.js` swaps the matching Google-Fonts `<link>` when
you change theme. Adding a fourth identity is just another token block.

- **Fonts** are all Google Fonts (SIL OFL). If the CDN is unreachable the page
  falls back to Georgia / system-ui and stays fully legible.
- **Signature motion** — one considered moment per theme: an orchestrated
  page-load reveal where the wordmark rises into view behind a mask and the
  tagline, actions and meta follow in sequence. No scroll-triggered animation.
  Disabled under `prefers-reduced-motion`; transform/opacity only for mobile
  smoothness; keyboard focus always visible.
- **Texture** — a subtle film-grain overlay (stronger in Moody/Chophouse,
  barely-there in Pacific NW) plus a per-theme "candlelight" radial in the hero.

> The earlier single-direction palette was generated via the `ui-toolkit` skill
> (`design/tokens.css`); the multi-theme system supersedes it but that file is
> left in place as a reference.

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

### ⚠️ Important: this is a front-end-only demo of those features

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

## Notes for the owner

- **Dietary tags are seeded conservatively.** Only tags we can infer safely are
  pre-filled; `Halal-friendly` is intentionally left unset (the kitchen serves
  pork). Review and correct every tag in the Menu tab before relying on them.
- **Images** are Ø placeholders until you add real photos — paste an image URL
  per item in the Menu editor. Real food photography is the single biggest
  upgrade to the page.
