import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const localRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(localRoot, "../..");
export default defineConfig({
  root: workspaceRoot,
  cacheDir: path.join(localRoot, ".validation-cache/workspace-vite"),
  resolve: { alias: { "@": workspaceRoot } },
  test: { include: ["lib/weekly/__tests__/**/*.test.{ts,tsx}"] },
});
