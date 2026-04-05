# 7. 与原生 Effect 的关系

- 对开发者而言，`$.flow.*` 只是围绕 Effect / Stream 封装的一组“语义化标准算子”，用来承载：
  - Trigger / 时间 / 并发策略（Flow）；
  - 分支 / 错误边界 / 并行结构（结构化控制流）。
- 任何细节性的逻辑（`map / flatMap / zip / forEach / race` 等）仍然鼓励直接使用 `Effect.* / Stream.*`，平台在静态分析时会将这部分视为 Gray/Black Box。
- 对平台而言，这些算子提供了稳定的 AST 锚点，可以在不执行代码的前提下构建 Logic Graph。
