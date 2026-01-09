# 1. 核心类型回顾（以当前实现为准）

本节用于在阅读 AppRuntime / flatten 实现备忘录时，对齐几个最常出现的类型名（避免与历史草图混淆）。

## 1.1 `ModuleDef` / `Module` / `ModuleImpl`

- **`ModuleDef`**：`Logix.Module.make(...)` 返回的“定义对象”。
  - 带 `.tag`（身份锚点）与 `.logic(...)`（产出 Logic 值）；
  - 通过 `.implement({ initial, logics, imports?, processes? })` 产出 `Module`（wrap module）。
- **`Module`**：带 `.impl` 的 wrap module（通常由 `ModuleDef.implement(...)` 或领域工厂返回）。
  - 支持 `withLogic/withLayers` 等不可变组合；
  - 业务侧常用消费形态（可直接交给 React/Runtime 装配）。
- **`ModuleImpl`**：可装配蓝图（供 Runtime/React 创建实例）。
  - `module`：对应的 `ModuleTag`；
  - `layer`：用于构造 `ModuleRuntime` 的 Layer；
  - `processes?`：该模块附带的长期任务（随实例 scope 生命周期运行）；
  - `withLayer/withLayers`：向 `layer` 追加环境依赖（收敛 Env）。

## 1.2 AppRuntime / `Logix.Runtime.make`

- 应用级 Runtime 以“Root module 的 `.impl`”作为入口：Root 通常是一个 `Module`（或直接传 `ModuleImpl`）。
- 入口 API：`Logix.Runtime.make(root, options)`（`root` 可为 program module 或其 `.impl`）。
  - 典型 options：`layer`（应用级 Env）、`middleware`（EffectOp 总线）、`devtools`、`onError`、`stateTransaction` 等。
