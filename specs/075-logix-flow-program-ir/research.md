# Research: FlowProgram IR（从命令式 Flow 到可编译控制律）

## 现状证据（仓库内）

- 既有动态能力：`@logixjs/core` 已有 `$.onAction().runLatest/runExhaust/runTask` 与 `FlowRuntime`（执行面已成熟），但缺少可导出的结构 IR（只能看运行时事件）。
- 073 的新裁决：tickSeq 是观测参考系；强一致只对可识别 IR 生效；事务窗口禁 IO；禁止影子真相源。
- 领域胶水痛点：Query/Form 仍通过手写 watcher 把“触发 → IO → 写回/联动”串起来，导致依赖与因果链难以解释与治理。

## 核心问题（升维）

我们缺的不是“能不能跑”，而是：

1. **可导出的静态形态**：让 Devtools/Alignment Lab 在不运行代码的情况下理解“会发生什么”。
2. **时间算子进入参考系**：delay/retry/timeout 必须进入 tick 的证据链（否则 replay/解释断裂）。
3. **写侧纪律**：自由编排必须通过可追踪写入路径（默认 dispatch），否则会破坏 txn/tick 的一致性与治理。

## 同构体（跨学科）

- TickScheduler ≈ 求解器/积分器；FlowProgram ≈ 控制律；StateTraitProgram ≈ 约束/势能（受限绑定）。
- “影子时间线”≈ 参考系之外的非协变项：局部看似合理，但全局无法保持因果与可解释性。

## 设计裁决（本 spec 的最小集合）

- FlowProgram 是“自由编排”的结构化表示：它不是 StateTrait 的一种 meta（避免语义混装）。
- FlowProgram 的最小节点集先收敛为：trigger(action/lifecycle/timer) + step(dispatch/serviceCall/delay) + concurrencyPolicy。
- 时间算子必须通过 tick 的可注入时间源调度（TestClock/TimerService），禁止默认 setTimeout。

## Open Questions

- API 落点：先做可挂载的 `ModuleLogic`（`Module.withLogic(FlowProgram.install(...))`），还是直接扩展 Module 蓝图增加 `flows` 槽位？
- ServiceCall 的抽象：以 `Context.Tag` 服务为中心（Tag-only），还是 `Resource` 风格（resourceId + key）？
- 分支表达：先用 success/failure 二分（serviceCall 的错误通道），还是通用 match/condition 节点？
- 取消/补偿：是否需要显式 compensation 节点，或先依赖业务 action 的 reducer + state 表达两阶段？

## 依赖规格（SSoT）

- `specs/073-logix-external-store-tick/*`：tick 参考系、Timer 触发的证据口径、diagnostics 成本门控
- `specs/001-effectop-unify-boundaries/*`：EffectOp/Middleware 总线（flow/service 边界事件）
- `specs/022-module/*`、`specs/023-logic-traits-setup/*`：蓝图/setup/run 的生命周期约束

