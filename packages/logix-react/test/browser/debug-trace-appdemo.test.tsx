import { test } from 'vitest'

// 占位测试：当前 packages/logix-react 的 browser 项目只针对库级场景，
// 不直接挂载 examples/logix-react 的 /app-counter 路由。
// 真正要在浏览器模式下验证 AppDemoLayout 的 trace 日志，需要在 examples/logix-react
// 自己的 Vitest 配置里运行完整应用，这里先跳过，以免干扰现有测试。
test.skip('AppDemoLayout: dispatch increment should emit trace:* debug events (placeholder)', async () => {
  // TODO: 在 examples/logix-react 下新增 browser 项目，
  // 使用 @vitest/browser 的 browser.openPage('/') 挂载实际应用后，
  // 再通过 window.__logixTraceBuffer__ 之类的方式断言 trace:* 事件。
})
