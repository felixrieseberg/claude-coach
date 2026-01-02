import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";
import { renameSync } from "fs";

// Plugin to rename output file
function renameOutput(): Plugin {
  return {
    name: "rename-output",
    closeBundle() {
      const from = resolve(__dirname, "templates/index.html");
      const to = resolve(__dirname, "templates/plan-viewer.html");
      try {
        renameSync(from, to);
      } catch {
        // File might not exist during dev
      }
    },
  };
}

export default defineConfig({
  plugins: [svelte(), viteSingleFile(), renameOutput()],
  root: "src/viewer",
  build: {
    outDir: resolve(__dirname, "templates"),
    emptyOutDir: false,
    target: "esnext",
    minify: "esbuild",
  },
});
