import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        main: resolve("src", "main.ts"),
        symbol: resolve("src", "symbol.ts"),
        string: resolve("src", "string", "index.ts"),
        types: resolve("src", "types", "index.ts"),
        decorator: resolve("src", "decorator", "index.ts"),
        react: resolve("src", "react", "index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      external: ["react", "react-dom", "zustand"],
    },
  },
  plugins: [
    dts({
      rollupTypes: false,
      tsconfigPath: "./tsconfig.app.json",
      entryRoot: "src",
      outDir: "dist",
      compilerOptions: {
        rootDir: "src",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
