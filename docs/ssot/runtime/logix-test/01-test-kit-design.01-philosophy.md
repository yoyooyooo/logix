# 1. 设计哲学：Pure Effect + Layer 友好

- **测试即 Effect**：不引入 Jest 风格命令式 API，测试场景本身是 `Effect` 程序，可以被 `@effect/vitest` / 自定义 runner 直接执行。
- **复用 Env / Layer 模型**：所有依赖一律通过 `Layer` 注入（Service Tag、Link Logic、外部服务），与业务代码保持同构。
- **Runtime 作为一等服务**：对 Logix 而言，测试的最小单元是 ModuleRuntime 或「场景」（主模块 + 协作模块 + Layer）。
- **与 runner 解耦**：`@logixjs/test` 不依赖 Vitest，本身只输出 `Effect` / `Layer` / 结构化结果；Effect 的执行交给 `@effect/vitest` 或 `Effect.runPromise`。

和官方的分工建议：

- 通用 Effect 逻辑 / Service 测试 → 使用 `@effect/vitest` 直接写 `it.effect` / `it.scoped`。
- Logix Module / Runtime 行为测试 → 使用 `@logixjs/test` 把场景封成 Effect 程序，再交给 `@effect/vitest`/Vitest 运行。

> `@logixjs/test` 依赖 `@logixjs/core`（以及未来的 runtime 包），但 **core/runtime 自身测试不反向依赖 `@logixjs/test`**，避免循环。core 层只使用 `@effect/vitest` + 少量本地 helper。
