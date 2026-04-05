# 4. exports：封装边界的实现策略

## 4.1 当前策略：类型 & 平台为主

在当前实现中：

- `exports` 的主要职责是：
  - **类型约束**：ModuleDef 类型中，只有 `exports` 中声明的 Tag 被视为对外可引用；
  - **平台检查**：Universe View 与依赖检查工具在发现“模块 A 使用了模块 B 未 exports 的 Tag”时，给出错误或强烈警告。
- Runtime 层面的 Env 暂时不做裁剪：
  - 这样所有 Tag 在开发/调试时都可以通过 `Effect.service` 拿到，降低实现复杂度；
  - 也便于在早期探索阶段尝试更多模式，而不被“Env 强隔离”挡路。

## 4.2 未来方向：Env 裁剪与 Scoped Layer（仅规划）

若未来需要更强封装，可以考虑：

- 在 `buildModule` 中引入 “投影 Layer”：
  - 内部构建完整 envLayer；
  - 对外仅暴露 `exports` 中的 Tag（例如通过包装 Runtime、限制可用 Tag 集合）。
- 或者通过 **多级 Scope** 模拟模块边界：
  - 每个 Module 拥有独立 Scope 与 Env；
  - 子 Module 只继承父 Module 的 `exports` 环境，而非全部 Tag。

以上方案都涉及较大的实现／调试成本，当前主线不落地，仅作为规划备忘。
