# Contract: Canonical Logic Execution

## 目标

定义 O-007 后 `ModuleRuntime` 逻辑启动的唯一执行契约。

## 输入契约

- 允许输入形态：单相 logic、`LogicPlan`、可解析为 plan 的 logic effect。
- 输入在执行前必须统一 normalize。

## 执行契约

1. `normalize(rawLogic) -> CanonicalLogicPlan`
2. `phase = setup`，执行 `plan.setup`
3. 若 `skipRun !== true`，`phase = run`，fork `plan.run`
4. setup 全部完成后统一启动 run 阶段

## 错误契约

- 发生 `LogicPhaseError` 时必须发出 `logic::invalid_phase` 结构化诊断。
- 诊断后是否 `skipRun` 由 normalize 结果决定，但必须保证行为可解释。

## 不变式

- setup/run 边界固定。
- 统一执行管线，不再按输入类型分叉到多套执行分支。
- 诊断事件为 Slim、可序列化结构。
