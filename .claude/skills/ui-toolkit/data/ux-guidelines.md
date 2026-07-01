# UX Guidelines (React + Tailwind + shadcn/ui)

## Spacing

Use a 4px base unit. Tailwind's default scale (`0.5` = 2px, `1` = 4px, `2` = 8px …)
already follows this; don't invent a parallel scale. Pick one step size per
context (e.g. `gap-4` inside a card, `gap-8` between page sections) rather than
mixing arbitrary values.

## Color roles, not raw hex

Never hardcode hex values in components. Map each palette to semantic Tailwind
theme keys (`primary`, `secondary`, `accent`, `neutral`, `success`, `warning`,
`danger`, `background`, `surface`) via `generate-tailwind-config.ts`, then
reference `bg-primary`, `text-danger`, etc. This is what makes a dark-mode
variant or a rebrand a token swap instead of a find-and-replace.

## Accessibility baseline

- Body text: minimum 4.5:1 contrast against its background.
- Interactive elements: minimum 44x44px touch target, visible focus ring
  (don't remove `outline` without providing a replacement focus style).
- Every shadcn `Dialog`/`Sheet`/`DropdownMenu` already wires up
  focus-trapping and `aria-*` via Radix primitives — don't re-implement it.
- Icon-only buttons need an `aria-label` or an adjacent visually-hidden label.

## Component states

Every interactive component should have a deliberate look for: default,
hover, focus-visible, active, disabled, and loading. Skipping loading/disabled
states is the most common gap — decide them at the same time as the default
state, not as an afterthought.

## Dark mode

Design the semantic token layer first (primary/secondary/accent/...), then
provide a second value set for `.dark`. Don't invert colors algorithmically;
neutrals in particular usually need hand-picked dark-mode values to avoid
muddy contrast.
