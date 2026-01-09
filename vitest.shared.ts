import path from "node:path";
import { jsToTsResolver } from "./scripts/vite-js-to-ts-resolver";

export const sharedConfig = {
  plugins: [jsToTsResolver()],
  test: {
    globals: true,
    alias: {
      // 统一指向各包的 src 目录，以便支持子路径导入（例如 @logixjs/core/Env）
      "@logixjs/core": path.resolve(__dirname, "./packages/logix-core/src"),
      "@logixjs/core-ng": path.resolve(__dirname, "./packages/logix-core-ng/src"),
      "@logixjs/i18n": path.resolve(__dirname, "./packages/i18n/src"),
      "@logixjs/sandbox": path.resolve(__dirname, "./packages/logix-sandbox/src"),
      "@logixjs/test": path.resolve(__dirname, "./packages/logix-test/src"),
      "@logixjs/perf-evidence": path.resolve(__dirname, "./.codex/skills/logix-perf-evidence"),
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.agent/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
};
