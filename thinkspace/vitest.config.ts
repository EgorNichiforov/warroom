import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    env: { THINKSPACE_PGLITE_DIR: ":memory:", LLM_PROVIDER: "mock", IMAGE_PROVIDER: "mock" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/shims/server-only.ts") },
  },
});
