import { defineConfig, mergeConfig } from "vitest/config"
import { sharedConfig } from "../../vitest.shared"

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      environment: "happy-dom",
      include: ["test/**/*.test.tsx", "test/**/*.test.ts"],
    },
  })
)
