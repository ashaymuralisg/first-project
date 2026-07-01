---
name: ui-toolkit
description: Design-token-driven UI workflow for React + Tailwind CSS + shadcn/ui. Curated color palettes and font pairings, plus scripts to generate tokens, a matching Tailwind config, and add shadcn/ui components. Use when building or restyling a React/Tailwind interface.
license: MIT (see LICENSE.txt)
---

# UI Toolkit (React + Tailwind + shadcn/ui)

This skill covers one stack deliberately: React, Tailwind CSS, and shadcn/ui.
It replaces ad-hoc color/font choices with a small token pipeline so a palette
or type swap stays a one-line change.

## Workflow

1. **Pick a palette and font pairing.** Browse `data/color-palettes.json` and
   `data/font-pairings.json` for options, or use them as a reference for
   picking your own values — they don't have to be used verbatim.
2. **Generate tokens.**
   ```bash
   cd scripts && npm install  # first time only
   npm run tokens:generate -- --palette slate-indigo --fonts corporate-clean --out ../../tokens
   ```
   This writes `tokens.json` (the source of truth) and `tokens.css`
   (`:root` / `.dark` custom properties) to the output directory.
3. **Validate tokens** whenever `tokens.json` is hand-edited:
   ```bash
   npm run tokens:validate -- ../../tokens/tokens.json
   ```
4. **Generate the Tailwind config** from those tokens:
   ```bash
   npm run tailwind:generate -- --tokens ../../tokens/tokens.json --out ../../tailwind.config.ts
   ```
   The generated config maps Tailwind theme colors to the CSS custom
   properties (`bg-primary` → `var(--color-primary)`, etc.) — import
   `tokens.css` in the app's global stylesheet so those variables exist at
   runtime.
5. **Add components** through the official shadcn/ui CLI (this just adds a
   `components.json` guard rail, it doesn't reimplement the registry):
   ```bash
   npm run shadcn:add -- button dialog dropdown-menu
   ```

## Design principles

- **Roles, not raw hex.** Components should reference `primary` / `danger` /
  `surface`, never a literal hex value — see `data/ux-guidelines.md`.
- **Dark mode is a token set, not an inversion.** `tokens.json` supports an
  optional `colorsDark` object; pick those values by eye rather than deriving
  them algorithmically from the light palette.
- **State coverage.** Every interactive component needs a default, hover,
  focus-visible, active, disabled, and loading treatment — decide all six
  together, not just the default.
- Full guidance: `data/ux-guidelines.md`.

## Licensing

Everything in this skill — data files, scripts, and their dependencies
(`commander`, `zod`, `tsx`, `typescript`) — is MIT or Apache-2.0 licensed and
safe for use in commercial/closed-source projects. `scripts/src/add-shadcn-component.ts`
shells out to the official `shadcn` CLI (MIT) rather than vendoring registry
code. Font pairings reference Google Fonts, which are distributed under the
SIL Open Font License.
