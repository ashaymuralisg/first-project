#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { designTokensSchema } from "./tokens-schema.js";

async function main() {
  const program = new Command();
  program
    .argument("<file>", "Path to a tokens.json file")
    .parse(process.argv);

  const [file] = program.args;
  const raw = JSON.parse(await readFile(file, "utf8"));
  const result = designTokensSchema.safeParse(raw);

  if (!result.success) {
    console.error(`Invalid tokens file: ${file}`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`${file} is valid.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
