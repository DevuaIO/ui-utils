import { resolve } from "node:path";
import { defineConfig } from "vite";
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
      entryRoot: "src",
      outDir: "dist",
      staticImport: true,
      compilerOptions: {
        rootDir: "src",
      },
    }),
  ],
});
