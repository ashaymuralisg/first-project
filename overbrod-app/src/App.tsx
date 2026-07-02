import SmoothScrollHero from "@/components/ui/smooth-scroll-hero";
import { ChevronDown } from "lucide-react";

/*
 * Background imagery.
 *
 * These are the Unsplash images shipped with the component (verified to
 * exist). For the real OVERBRØD site, swap them for deli/food photography —
 * the component takes them as props, so it's a one-line change per image, and
 * it falls back to a solid black backdrop if an image ever fails to load.
 */
const DESKTOP_IMAGE = "https://images.unsplash.com/photo-1511884642898-4c92249e20b6";
const MOBILE_IMAGE =
  "https://images.unsplash.com/photo-1511207538754-e8555f2bc187?q=80&w=2412&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

function App() {
  return (
    <main className="relative w-full bg-background text-foreground">
      {/* ---- Hero: the smooth-scroll parallax reveal, with brand overlay ---- */}
      <section className="relative">
        <SmoothScrollHero
          scrollHeight={1500}
          desktopImage={DESKTOP_IMAGE}
          mobileImage={MOBILE_IMAGE}
          initialClipPercentage={25}
          finalClipPercentage={75}
        />

        {/* Brand overlay pinned to the first viewport. pointer-events-none so it
            never blocks scrolling; the CTA re-enables pointer events. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-screen flex-col items-center justify-center px-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60" />
          <div className="relative z-10 flex flex-col items-center">
            <p className="mb-6 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/70">
              Scandinavian deli · Alexandra, Singapore
            </p>
            <h1 className="font-serif text-6xl font-semibold leading-none tracking-tight text-[#f3e9d6] md:text-8xl">
              OVERBR<span className="text-primary">Ø</span>D
            </h1>
            <p className="mt-6 max-w-md font-serif text-lg italic text-white/85 md:text-xl">
              Handcrafted Sm<span className="text-primary">ø</span>rrebr
              <span className="text-primary">ø</span>d. The classic Danish dish,
              with an Overbr<span className="text-primary">ø</span>d twist.
            </p>
            <a
              href="#story"
              className="pointer-events-auto mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
            >
              Reserve a table
            </a>
          </div>
          <ChevronDown
            className="absolute bottom-10 z-10 h-6 w-6 animate-bounce text-white/70"
            aria-hidden="true"
          />
        </div>
      </section>

      {/* ---- Content below the hero, so the scroll reveal has somewhere to go ---- */}
      <section
        id="story"
        className="mx-auto max-w-3xl scroll-mt-8 px-6 py-28 md:py-40"
      >
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-secondary">
          Our story
        </p>
        <h2 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">
          A part of Scandinavia, plated in Singapore.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-foreground/80">
          OVERBRØD is a Scandinavian-inspired deli focusing on smørrebrød
          (Danish open-faced sandwiches) and other Scandinavian dishes like
          Swedish meatballs and Norwegian reindeer stew. Using techniques like
          curing, smoking and pickling, we bring a part of Scandinavia to
          Singapore — with an OVERBRØD twist.
        </p>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} OVERBRØD · 370 Alexandra Rd, Singapore
      </footer>
    </main>
  );
}

export default App;
