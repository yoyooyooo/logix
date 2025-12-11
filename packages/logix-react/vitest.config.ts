import { defineConfig, mergeConfig } from "vitest/config"
import { playwright } from "@vitest/browser-playwright"
import { sharedConfig } from "../../vitest.shared"

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      // 默认项目：沿用现有 happy-dom 环境，覆盖所有单元 / hooks / 集成测试
      projects: [
        {
          extends: true,
          test: {
            name: {
              label: "unit",
              color: "cyan",
            },
            environment: "happy-dom",
            include: ["test/**/*.test.tsx", "test/**/*.test.ts"],
            exclude: ["test/browser/**"],
          },
        },
        {
          // browser 项目：只跑真实浏览器环境下的集成测试
          extends: true,
          test: {
            name: {
              label: "browser",
              color: "green",
            },
            include: ["test/browser/**/*.test.tsx", "test/browser/**/*.test.ts"],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [
                {
                  browser: "chromium",
                },
              ],
            },
          },
        },
      ],
    },
  }),
)
