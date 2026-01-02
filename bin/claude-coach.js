#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "src", "cli.ts");

// Use tsx to run the TypeScript CLI
const result = spawnSync("npx", ["tsx", cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
