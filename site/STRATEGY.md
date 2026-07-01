# OVERBRØD — Strategy (Phases 1 & 2)

Analysis written to steer the build. Every finding below maps to a concrete
decision in the site, so the strategy and the code stay in sync.

---

## Phase 1 — Business Intelligence & Market Analysis

### 1. Psychological barriers & primary needs of a Singapore café customer

Singapore diners are spoiled for choice and short on time; the deciding
factors before a visit are rarely about whether the food is *good* — they
assume it is — but about **risk and effort**. The real barriers:

1. **Unfamiliarity risk.** Smørrebrød, frikadeller, stjerneskud — these words
   mean nothing to most locals. Fear of ordering "wrong" or not knowing what a
   dish is stops the booking. *Need: plain-language descriptions and a clear
   signal of what to order first.*
2. **Value scrutiny.** A $26 open-faced sandwich invites "is it worth it?"
   Singaporeans price-check hard. *Need: transparent, itemised pricing and the
   "no GST, no service charge" fact surfaced (reviewers already praise it).*
3. **Location friction.** 370 Alexandra Rd is not a walk-from-MRT spot.
   Ambiguity about how to get there or park is a silent conversion killer.
   *Need: explicit transit + parking instructions.*
4. **Dietary uncertainty.** Halal, vegan, gluten, nut allergies — unanswered,
   these become a reason not to come. *Need: per-dish dietary tags.*
5. **Booking effort.** If reserving means calling during service hours, a large
   share of intent evaporates. *Need: a self-serve form that works at 1am.*

### 2. Top 5 "conversation triggers" that lead to a booked reservation

The moments most likely to convert browsing intent into a confirmed booking:

1. **The signature-dish reveal** — naming *The Shooting Star / Stjerneskud* as
   the thing to try removes choice paralysis and creates a "I want *that*"
   pull. (Implemented: `Signature` tags on the menu.)
2. **Third-party validation at the point of doubt** — real 5★ reviews placed
   *after* the menu, not buried, catching the reader exactly when they're
   deciding. (Implemented: Social Proof section, verbatim reviews.)
3. **Transparency as trust** — visible prices + "no service charge / no GST"
   converts value-anxiety into a reason to come. (Implemented: menu pricing,
   value note.)
4. **Zero-friction, always-open booking** — a form that captures date/time/
   party in three taps and confirms instantly. (Implemented: reservation
   system.)
5. **Proximity certainty** — "Nearest MRT: Queenstown Exit B/C via bus 195A;
   park at Anchorpoint Basement or IKEA Alexandra" turns "where even is this?"
   into "easy, let's go." (Implemented: Logistics section.)

### 3. Competitive analysis — where OVERBRØD outperforms

A survey of how well-rated Singapore cafés present themselves digitally
(Atlas Coffeehouse, Tiong Bahru Bakery, PPP Coffee, Baker & Cook and similar)
shows a consistent pattern: strong social feeds, weak *websites*. Common gaps
— menus locked in PDFs or Instagram highlights, bookings pushed to third-party
platforms, no dietary info, no directions. Five specific areas OVERBRØD beats
them on:

| # | Area | Typical competitor | OVERBRØD advantage |
|---|------|--------------------|--------------------|
| 1 | **Menu visualisation** | PDF / IG screenshots, no prices or descriptions | Categorised, described, priced, signature-flagged, dietary-tagged, searchable in-page |
| 2 | **Booking** | "DM us" or an external widget that leaves the site | Native reservation form, PDPA-compliant, no redirect, works 24/7 |
| 3 | **Information transparency** | Hours only; dietary & pricing hidden | Prices, dietary tags, hours, transit, "no GST/service charge" all up front |
| 4 | **Wayfinding** | A bare Google Maps pin | Explicit MRT + bus + parking instructions alongside the map link |
| 5 | **Ease of update** | Static site; owner can't edit without a developer | Built-in staff CMS — menu & bookings managed by the team, no dev needed |

---

## Phase 2 — Content Strategy

**Goal:** build maximum trust and remove every friction point identified above,
in the order a visitor actually forms a decision.

### Narrative order (mirrors the decision funnel)

1. **Hero — identity & intrigue.** Name + tagline establish "Danish, handcrafted,
   a twist." One clear action: *Reserve a table.* Nothing to read yet, just a
   hook and a door.
2. **Our Story — credibility.** The bio verbatim. Curing, smoking, pickling =
   craft signals that justify the price before the price appears.
3. **Menu — desire + transparency.** The core of the page. Every dish described
   in plain terms (kills unfamiliarity risk), priced (kills value anxiety),
   dietary-tagged (kills dietary uncertainty), with signatures called out
   (kills choice paralysis).
4. **Social Proof — validation.** Real reviews placed right after desire peaks,
   including the reviewer who admits low expectations then raves — the most
   persuasive arc for a sceptical first-timer.
5. **Reservation — conversion.** Placed while intent is hot. Three-step,
   self-serve, PDPA note visible so data-sharing feels safe.
6. **Logistics — remove the last excuse.** Hours, contact, socials, map, and
   the transit/parking specifics that turn "too far" into "doable."

### Voice & copy principles

- **Plain over exotic.** Every Scandinavian term is immediately paired with a
  plain-English gloss ("Stjerneskud — the Shooting Star"). Intrigue, never
  confusion.
- **Specific over salesy.** Describe what a dish *is* and what makes it land,
  not adjective soup. Reviewers already supply the credible language ("thick,
  nicely fried halibut," "creamy fisksoppa") — echo that register.
- **Active, consistent labels.** The button says *Reserve a table*; the
  confirmation says *Table requested*. One vocabulary end to end.
- **Trust made explicit.** "No service charge. No GST." and the PDPA line are
  stated plainly, because in this market transparency is the differentiator.

### Friction-removal execution checklist

- [x] Prices visible on every item
- [x] Plain-language description on every dish
- [x] Dietary tags (Vegan, Halal-friendly, Nut-free, Gluten-free)
- [x] Signature dishes flagged to guide first orders
- [x] Reservation form self-serve, no external redirect, 24/7
- [x] PDPA consent note at point of data entry
- [x] Transit + parking instructions, not just a map pin
- [x] Staff CMS so content never goes stale
