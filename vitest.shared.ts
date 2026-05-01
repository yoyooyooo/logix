import path from "node:path";
import { jsToTsResolver } from "./scripts/vite-js-to-ts-resolver";

const alias = {
  // 统一指向各包的 src 目录，以便支持子路径导入（例如 @logixjs/core/Env）
  "@logixjs/core/repo-internal/InternalContracts": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/InternalContracts.ts",
  ),
  "@logixjs/core/repo-internal/debug-api": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/debug-api.ts",
  ),
  "@logixjs/core/repo-internal/effect-op": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/effect-op.ts",
  ),
  "@logixjs/core/repo-internal/evidence-api": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/evidence-api.ts",
  ),
  "@logixjs/core/repo-internal/field-contracts": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/field-contracts.ts",
  ),
  "@logixjs/core/repo-internal/kernel-api": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/kernel-api.ts",
  ),
  "@logixjs/core/repo-internal/read-contracts": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/read-contracts.ts",
  ),
  "@logixjs/core/repo-internal/reflection-api": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/reflection-api.ts",
  ),
  "@logixjs/core/repo-internal/runtime-contracts": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/runtime-contracts.ts",
  ),
  "@logixjs/core/repo-internal/workbench-api": path.resolve(
    __dirname,
    "./packages/logix-core/src/internal/workbench-api.ts",
  ),
  "@logixjs/core": path.resolve(__dirname, "./packages/logix-core/src"),
  "@logixjs/i18n": path.resolve(__dirname, "./packages/i18n/src"),
  "@logixjs/playground": path.resolve(__dirname, "./packages/logix-playground/src"),
  "@logixjs/sandbox": path.resolve(__dirname, "./packages/logix-sandbox/src"),
  "@logixjs/test": path.resolve(__dirname, "./packages/logix-test/src"),
  "@logixjs/perf-evidence": path.resolve(__dirname, "./packages/logix-perf-evidence"),
};

export const sharedConfig = {
  plugins: [jsToTsResolver()],
  resolve: {
    alias,
  },
  test: {
    globals: true,
    alias,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.agent/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
};
