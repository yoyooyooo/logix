import path from "path"

export const sharedConfig = {
  test: {
    globals: true,
    alias: {
      // 统一指向各包的 src 目录，以便支持子路径导入（例如 @logix/core/env）
      "@logix/core": path.resolve(__dirname, "./packages/logix-core/src"),
      "@logix/sandbox": path.resolve(__dirname, "./packages/logix-sandbox/src"),
      "@logix/test": path.resolve(__dirname, "./packages/logix-test/src"),
    },
    exclude: ["**/node_modules/**", "**/dist/**", "packages/_archive*/**"],
  }
}
