# 3. 与 `@effect/vitest` 的协作边界

## 3.1 建议分工

- **`@effect/vitest`**
  - 提供 `it.effect` / `it.scoped` / `layer` / `expect` 等测试入口。
  - 内建 `TestContext`、`TestClock`、属性测试工具等。
  - 对任何 `Effect` 程序一视同仁，不关心 Logix 语义。

- **`@logixjs/test`**
  - 在 `Effect` 基础上提供 Logix 特化能力：
    - 场景级 DSL（`TestProgram` + `TestApi`）；
    - Runtime 级工具（`TestRuntime`）；
    - 结构化 ExecutionResult + trace。
  - 不直接导出 Vitest 相关 API，不感知测试 runner。

## 3.2 logix-core / logix-runtime 是否复用 `@logixjs/test`

当前原则：

- `@logixjs/test` 依赖 `@logixjs/core`（未来也可以依赖 `@logixjs/runtime`），定位在「上游应用/业务仓库」。
- `@logixjs/core` / `@logixjs/runtime` 自身的单元测试 **不反向依赖** `@logixjs/test`，只使用：
  - `@effect/vitest`（Effect 版 Vitest API）；
  - 本包内部的一些类型/构造 helper（如 `Module.make` + `Runtime.make`）。

如果未来发现 core/runtime 层也需要共同的测试基元，可以考虑拆出一个不依赖 `@logixjs/core` 的轻量包（例如「test-kernel」），只提供：

- `runWithTestContext`；
- 通用的 `waitUntil` / Effect 断言模式；
- 一些纯 Effect 小工具。

`@logixjs/test` 则在其上叠加 Logix 语义（Module/Runtime/Scenario），继续依赖 `@logixjs/core`。
