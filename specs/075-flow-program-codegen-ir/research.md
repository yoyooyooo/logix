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
- FlowProgram 的最小节点集先收敛为：trigger(action/lifecycle) + step(dispatch/serviceCall/delay) + concurrencyPolicy；timer fire 属于 `delay/timeout/retry` 等时间算子的内部调度结果（需进入 tick 参考系与 trace/tape）。
- 时间算子必须通过可注入的时间源调度（例如 `HostScheduler.scheduleTimeout` / Effect `Clock`；测试可注入 TestClock/DeterministicHostScheduler），禁止默认 `setTimeout`。

## Open Questions

- ✅ API 落点：v1 先做可挂载的 `ModuleLogic`（推荐 `Module.withFlow(program)` / 底层 `program.install(Module.tag)`）；蓝图 `flows` 槽位作为后续 DX 演进（forward-only）。
- ✅ ServiceCall 的抽象：采用 Tag-only（`Context.Tag`），并将稳定 `serviceId` 按 `specs/078-module-service-manifest/contracts/service-id.md` 派生进入 Static IR/Trace/Tape（单点 helper）。
- ✅ 分支表达：v1 先做 success/failure 二分（authoring sugar `onSuccess/onFailure`），但编译后必须显式落到图结构（节点/边），为 Devtools/diff/解释链提供单一真相源。
- 取消/补偿：是否需要显式 compensation 节点，或先依赖业务 action 的 reducer + state 表达两阶段？

## 依赖规格（SSoT）

- `specs/073-logix-external-store-tick/*`：tick 参考系、Timer 触发的证据口径、diagnostics 成本门控
- `specs/001-effectop-unify-boundaries/*`：EffectOp/Middleware 总线（flow/service 边界事件）
- `specs/022-module/*`、`specs/023-logic-traits-setup/*`：蓝图/setup/run 的生命周期约束
