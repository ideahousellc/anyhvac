import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: path.join(projectRoot, ".validation-cache/vite"),
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
});
