#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Command } from "commander";

// Thin wrapper around the official shadcn/ui CLI (MIT-licensed, maintained by
// shadcn/ui). We don't reimplement registry fetching or component codegen —
// `npx shadcn@latest` already does that and stays current with the registry.
async function main() {
  const program = new Command();
  program
    .argument("<components...>", "Component names, e.g. button dialog dropdown-menu")
    .option("--yes", "Skip confirmation prompts", true)
    .parse(process.argv);

  const components = program.args;
  const opts = program.opts<{ yes: boolean }>();

  if (!existsSync("components.json")) {
    console.error(
      "No components.json found in this directory. Run `npx shadcn@latest init` first."
    );
    process.exitCode = 1;
    return;
  }

  const args = ["shadcn@latest", "add", ...components];
  if (opts.yes) args.push("--yes");

  const result = spawnSync("npx", args, { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
