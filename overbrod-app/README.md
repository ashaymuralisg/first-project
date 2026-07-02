# overbrod-app

A Vite + React + TypeScript + Tailwind CSS app (shadcn-compatible structure)
that integrates the **`smooth-scroll-hero`** component and uses it to build the
OVERBRØD hero.

This lives alongside the vanilla static site in `../site`. It was created from
scratch because the repo had no React/TS/Tailwind/shadcn setup.

## Run

```bash
cd overbrod-app
npm install
npm run dev        # local dev server
npm run build      # typecheck (tsc --noEmit) + production build to dist/
npm run preview    # preview the production build
```

## How this was set up (and the shadcn CLI equivalent)

The repo had no `package.json`, TypeScript, Tailwind, or shadcn config, so the
toolchain was created directly. The equivalent using the official CLIs would be:

```bash
npm create vite@latest overbrod-app -- --template react-ts
cd overbrod-app
npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
npx shadcn@latest init          # writes components.json, lib/utils, CSS vars
npm install framer-motion lucide-react
```

### Why the component path must be `@/components/ui`

shadcn's convention is `@/components/ui`, and the provided `demo.tsx` imports:

```ts
import SmoothScrollHero from "@/components/ui/smooth-scroll-hero";
```

That import resolves **only** if two things are true, both of which are
configured here:

1. **The folder exists** at `src/components/ui/` — where the component file
   lives (`src/components/ui/smooth-scroll-hero.tsx`).
2. **The `@` alias points at `src`** — configured in `vite.config.ts`
   (`resolve.alias`) for the bundler *and* in `tsconfig.json`
   (`compilerOptions.paths`) for the type-checker. Miss either and the build
   fails to resolve the import.

Keeping components in `@/components/ui` is what lets any shadcn component (and
anything that imports one) resolve consistently without relative-path spaghetti.

## Integration notes

- **Dependency added:** `framer-motion` (the component's `useScroll`,
  `useTransform`, `useMotionTemplate`, `motion`). `lucide-react` is used for the
  hero's scroll-cue chevron.
- **Component:** `src/components/ui/smooth-scroll-hero.tsx` (verbatim), plus the
  supplied `src/components/ui/demo.tsx`.
- **Usage:** `src/App.tsx` uses `<SmoothScrollHero>` as the parallax hero
  background with an OVERBRØD brand overlay pinned to the first viewport
  (`pointer-events-none` so it never blocks scroll; the CTA re-enables events).
- **Props:** `scrollHeight`, `desktopImage`, `mobileImage`,
  `initialClipPercentage`, `finalClipPercentage`. The component is purely
  presentational — no state/context/providers required.
- **Responsive:** the component swaps mobile/desktop images at Tailwind's `md`
  breakpoint and zooms the background 170%→100% while the clip-path expands on
  scroll.
- **Images:** currently the Unsplash images shipped with the component (verified
  to exist). Swap them for OVERBRØD food photography via the `desktopImage` /
  `mobileImage` props — the component falls back to a solid black backdrop if an
  image fails to load.
- **Theme:** `src/index.css` maps shadcn's CSS variables to the OVERBRØD palette
  (cream background, deep-red primary, antique-gold secondary), so it matches
  the static site's finalized direction.
