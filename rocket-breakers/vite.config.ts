import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single self-contained index.html (fonts, catalog and code inlined) so the
// game runs from one file: phone browser, artifact page or offline.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  // Isolate from the ShopDash root postcss/tailwind config one folder up.
  css: { postcss: { plugins: [] } },
  build: { target: "es2022", assetsInlineLimit: 100_000_000, outDir: "dist" },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
