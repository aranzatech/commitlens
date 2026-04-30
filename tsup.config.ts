import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    cli: "src/cli/index.ts"
  },
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "node18",
  treeshake: true
});
