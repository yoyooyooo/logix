import path from "path"

export const sharedConfig = {
  test: {
    globals: true,
    alias: {
      "@logix/core": path.resolve(__dirname, "./packages/logix-core/src/index.ts"),
      "@logix/sandbox": path.resolve(__dirname, "./packages/logix-sandbox/src/index.ts"),
      "@logix/test": path.resolve(__dirname, "./packages/logix-test/src/index.ts"),
    },
    exclude: ["**/node_modules/**", "**/dist/**", "packages/_archive*/**"],
  }
}
