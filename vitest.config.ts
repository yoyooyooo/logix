import { defineConfig } from 'vitest/config'
import { sharedConfig } from './vitest.shared'

export default defineConfig({
  ...sharedConfig,
  test: {
    ...sharedConfig.test,
    // 根目录下运行 vitest 时：
    // - 只跑各包的单元 / 集成测试（happy-dom / node 环境）；
    // - 浏览器模式相关用例交给各子包自己的 vitest.config 管理（例如 @logix/react / @logix/sandbox 的 browser project）。
    exclude: [...(sharedConfig.test?.exclude ?? []), '**/packages/**/test/browser/**'],
  },
})
