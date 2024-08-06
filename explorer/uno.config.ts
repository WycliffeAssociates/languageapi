import {defineConfig} from "unocss";

export default defineConfig({
  cli: {
    entry: {
      patterns: ["./src/**/*.{ts,tsx}"],
      outFile: "./src/uno_gen.css",
    }, // CliEntryItem | CliEntryItem[]
  },
  // ...
});
