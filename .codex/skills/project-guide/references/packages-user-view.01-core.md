# 1) `@logix/core`（引擎：ModuleDef/Logic/Runtime/Debug/Resource）

## 你在什么情况下会用它

- 想定义一个可运行/可组合/可回放的模块（ModuleDef/ModuleImpl）。
- 想把业务流程写成 Effect 并跑在统一 Runtime 里（Logic/Flow/Runtime）。
- 想让副作用可观测、可拦截、可回放（EffectOp + Debug/Observability）。

## 核心概念（最短心智模型）

- `Logix.Module.make`：定义契约并返回 `ModuleDef`（state/actions/reducers/traits）。
- `ModuleDef.logic(($)=>...)`：定义行为（Effect / LogicPlan）。
- `ModuleDef.implement(...)`：返回**可运行 Module（wrap module）**；其 `.impl` 是 `ModuleImpl` 蓝图（含 imports/processes/layer）。
- `Runtime.make(root, { layer, middleware, devtools, ... })`：组合 Layer + middleware，得到可运行 Runtime（`root` 可为 program module 或其 `.impl`）。

## 最小用法（从能写到能跑）

- 看编程模型与 `$`：`apps/docs/content/docs/api/core/module.md`、`apps/docs/content/docs/api/core/bound-api.md`、`apps/docs/content/docs/api/core/flow.md`
- 看 Runtime 组装：`apps/docs/content/docs/api/core/runtime.md`
- 看“真实导出裁决”：`packages/logix-core/src/index.ts`
- 看最小可运行场景：`examples/logix/src/scenarios/*`、`examples/logix/src/patterns/*`

## 常见坑（只记最常见的 2 个）

- `setup` 段调用 run-only API（`$.onAction/$.onState/$.use` 等）会触发 phase guard（`logic::invalid_phase`）。
- 事务窗口禁 IO：任何 async/外部调用应在 run 段独立 Fiber 中完成，再 `dispatch/update/mutate` 回写。
