import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve("src", "main.ts"),
      fileName: "[name]",
      formats: ["es"],
    },
  },
  plugins: [
    dts({
      rollupTypes: false,
      tsconfigPath: "./tsconfig.json",
      afterBuild() {
        const fromDir = resolve("dist", "src");
        const from = resolve(fromDir, "main.d.ts");
        const to   = resolve("dist", "main.d.ts");

        if (existsSync(from)) {
          copyFileSync(from, to);
          rmSync(fromDir, { recursive: true, force: true });
        }
      },
    }),
  ],
});