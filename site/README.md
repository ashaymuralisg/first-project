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

## Design

- **Direction** — refined and editorial: a restrained palette of aged paper
  and warm charcoal with a single cured-meat **oxblood** accent (no secondary
  colours competing for attention), and generous whitespace.
- **Palette** — aged paper (`#E7E0D2`) + warm charcoal (`#262320`), one oxblood
  accent (`#7A2E30`). Generated through the `ui-toolkit` skill (`npm run
  tokens:generate -- --palette overbrod-refined --fonts overbrod-editorial`)
  and consumed via `design/tokens.css`.
- **Type** — Fraunces (characterful editorial serif) over Hanken Grotesk (clean
  grotesque), from Google Fonts (SIL OFL). If the fonts CDN is ever unreachable,
  the page falls back to Georgia / system-ui and stays fully legible.
- **Signature motion** — one considered moment: an orchestrated page-load reveal
  where the wordmark rises into view behind a mask and the tagline, actions and
  meta follow in sequence. There are no scroll-triggered animations. The whole
  sequence is disabled under `prefers-reduced-motion`, uses only transform /
  opacity so it stays smooth on mobile, and keyboard focus is always visible.

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
