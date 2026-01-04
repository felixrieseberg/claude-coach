#!/usr/bin/env node

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "dist", "cli.js");

// Dynamically import the compiled CLI
await import(cliPath);
