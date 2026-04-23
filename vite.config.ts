import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        main: resolve("src", "main.ts"),
        string: resolve("src", "string", "index.ts"),
        types: resolve("src", "types", "index.ts"),
        react: resolve("src", "react", "index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
      tsconfigPath: "./tsconfig.json",
      entryRoot: "src",
      outDir: "dist",
      compilerOptions: {
        rootDir: "src",
      },
    }),
  ],
});
