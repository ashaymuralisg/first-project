#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { designTokensSchema } from "./tokens-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

interface Palette {
  id: string;
  name: string;
  colors: Record<string, string>;
}

interface FontPairing {
  id: string;
  display: string;
  body: string;
}

async function loadPalette(id: string): Promise<Palette> {
  const raw = JSON.parse(
    await readFile(join(DATA_DIR, "color-palettes.json"), "utf8")
  ) as { palettes: Palette[] };
  const palette = raw.palettes.find((p) => p.id === id);
  if (!palette) {
    const available = raw.palettes.map((p) => p.id).join(", ");
    throw new Error(`Unknown palette "${id}". Available: ${available}`);
  }
  return palette;
}

async function loadFontPairing(id: string): Promise<FontPairing> {
  const raw = JSON.parse(
    await readFile(join(DATA_DIR, "font-pairings.json"), "utf8")
  ) as { pairings: FontPairing[] };
  const pairing = raw.pairings.find((p) => p.id === id);
  if (!pairing) {
    const available = raw.pairings.map((p) => p.id).join(", ");
    throw new Error(`Unknown font pairing "${id}". Available: ${available}`);
  }
  return pairing;
}

function toCssVariables(tokens: ReturnType<typeof designTokensSchema.parse>): string {
  const lines: string[] = [":root {"];
  for (const [key, value] of Object.entries(tokens.colors)) {
    lines.push(`  --color-${key}: ${value};`);
  }
  lines.push(`  --font-display: "${tokens.fonts.display}";`);
  lines.push(`  --font-body: "${tokens.fonts.body}";`);
  lines.push(`  --radius: ${tokens.radius};`);
  lines.push("}");

  if (tokens.colorsDark) {
    lines.push("", ".dark {");
    for (const [key, value] of Object.entries(tokens.colorsDark)) {
      lines.push(`  --color-${key}: ${value};`);
    }
    lines.push("}");
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const program = new Command();
  program
    .requiredOption("--palette <id>", "Palette id from data/color-palettes.json")
    .requiredOption("--fonts <id>", "Font pairing id from data/font-pairings.json")
    .option("--radius <value>", "Border radius (e.g. 0.5rem)", "0.5rem")
    .option("--out <dir>", "Output directory", "./tokens")
    .parse(process.argv);

  const opts = program.opts<{
    palette: string;
    fonts: string;
    radius: string;
    out: string;
  }>();

  const palette = await loadPalette(opts.palette);
  const fontPairing = await loadFontPairing(opts.fonts);

  const tokens = designTokensSchema.parse({
    name: palette.name,
    colors: palette.colors,
    fonts: { display: fontPairing.display, body: fontPairing.body },
    radius: opts.radius,
  });

  await mkdir(opts.out, { recursive: true });
  await writeFile(
    join(opts.out, "tokens.json"),
    JSON.stringify(tokens, null, 2) + "\n",
    "utf8"
  );
  await writeFile(join(opts.out, "tokens.css"), toCssVariables(tokens), "utf8");

  console.log(`Wrote ${join(opts.out, "tokens.json")} and tokens.css`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
