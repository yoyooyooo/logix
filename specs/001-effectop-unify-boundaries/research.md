# Research: 001-effectop-unify-boundaries

**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/plan.md`  
**Date**: 2025-12-12

## Decisions

### D-001: 总线收口范围

- **Decision**: 覆盖所有当前已存在的边界类型（包含内部类边界与调试类边界），一律进入同一条 middleware 管线。
- **Rationale**: “少覆盖一类”就等于为策略/审计/观测制造盲点，且会把复杂度推到业务侧与后续迭代。
- **Alternatives considered**:
  - 仅覆盖业务关键边界：短期省事，但长期必然补债且难以验收“无漏网”。

### D-002: 全局策略 vs 局部策略优先级

- **Decision**: 全局守卫不可被局部关闭；局部只允许追加信息或收紧约束；局部可关闭“纯观测类”能力。
- **Rationale**: 防止“局部绕过全局守卫”成为系统性安全漏洞，同时保留足够的 DX 弹性（观测可按需关闭）。
- **Alternatives considered**:
  - 局部可覆盖一切：灵活但高风险，且验收/审计成本显著上升。

### D-003: 守卫拒绝语义

- **Decision**: 守卫拒绝对调用方表现为“显式拒绝失败”（可区分于成功），且不产生任何业务副作用。
- **Rationale**: 失败需要可编排与可测试；no-op 语义会制造“看似成功但没发生”的不可解释行为。
- **Alternatives considered**:
  - no-op：降低调用方错误处理成本，但语义含糊、难以审计、易出生产事故。

### D-004: 多步边界操作关联键（操作链路 id）

- **Decision**: 必须提供一个关联键（操作链路 id），用于把同一链路下的多次边界操作关联起来。
- **Rationale**: 没有关联键，观测与审计只能停留在“单事件”，无法回放真实链路。
- **Alternatives considered**:
  - 仅事务内关联：边界起点不总是事务，仍会丢链路上下文。

## Open Questions（resolved by design）

本轮不再保留 `NEEDS CLARIFICATION`：关键语义已通过 spec Clarifications 写死，后续实现按此验收。

## Notes / Implications

- 本次允许破坏性重构：为实现守卫拒绝语义与“总线不可绕过”，可能需要调整若干公共 API 的错误通道/返回类型；以“单一事实源 + 单一执行入口”为优先。
- 文档迁移是必需品：`apps/docs` 与 `.codex/skills/project-guide/references/runtime-logix` 必须同步改写，避免旧入口/旧叙事继续误导使用者。

## Boundary Execution Points（覆盖矩阵草图）

> 目标：列出“哪些地方会执行边界操作”，作为后续接线与测试覆盖矩阵的事实源。

### Runtime / Core

- Lifecycle：模块 init/destroy 等生命周期事件
- Action：dispatch 与 action 发布
- State：state:update（含事务 commit 后的聚合写入）
- Devtools：time-travel 等调试类入口

### Flow

- Flow.run / runLatest / runExhaust / runParallel：每次事件处理（payload → handler）
- Flow.runFork / runParallelFork：fork 的 watcher 入口

### Traits / Services

- trait-computed / trait-link / trait-source：StateTrait.install 触发的更新/传播/刷新
- service：资源/请求类边界（若存在统一资源层/查询层）

### Debug / Observability

- trace:\*：对所有边界操作的观测事件（用于 Devtools 时间线）

### Acceptance Coverage Rule

- 以上每一类边界操作都必须被统一 middleware 观测到（包含内部与调试类边界），并携带 linkId。

---

## 001a 回查（EffectOp / Middleware 对齐结论）

> 目标：对照 `specs/001a-module-traits-runtime/*` 中与 EffectOp/Middleware 相关承诺，给出“已覆盖/需修订/延期”清单，作为后续演进锚点。
>
> 主要参考：
>
> - `specs/001a-module-traits-runtime/spec.md`
> - `specs/001a-module-traits-runtime/references/effectop-and-middleware.md`

| 条目                    | 001a 承诺（摘要）                                                                                                        | 当前实现（001-effectop-unify-boundaries）                                                                                                                      | 结论                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| 统一总线                | Action / Flow / State / Service / Lifecycle / Trait / Devtools 等边界执行统一提升为 EffectOp，并必经同一 MiddlewareStack | 已通过 `ModuleRuntime.runOperation` + `EffectOpMiddlewareTag` 收口；Flow/Bound/Trait/Debug 等均接线进入总线                                                    | 已覆盖                                                              |
| MiddlewareStack 注入    | Runtime.make 注入 `EffectOpMiddlewareEnv { stack }`，运行时代码通过 Env 读取同一 stack                                   | 已实现 `EffectOpMiddlewareTag` + `RuntimeOptions.middleware` 注入；StateTrait.install / FlowRuntime 等通过 Env 读取                                            | 已覆盖                                                              |
| Middleware 组合语义     | `composeMiddleware(stack)` 使用 reduceRight，顺序为 `mw1 -> mw2 -> effect -> mw2 -> mw1`                                 | 已实现并保持 reduceRight 语义；并在测试中验证顺序                                                                                                              | 已覆盖                                                              |
| Trait → EffectOp        | StateTrait.install 在触发条件满足时构造 EffectOp，并交给 MiddlewareStack 执行（不直接依赖中间件细节）                    | 已实现：Trait 的 computed/link/source 以 EffectOp 形式输出，并通过 Env 中 stack 执行                                                                           | 已覆盖                                                              |
| Guard 显式拒绝          | 需要一个“显式拒绝失败”结果（可区分于成功），拒绝发生在用户 effect 之前且无副作用                                         | 已实现 `OperationRejected` + 运行前拒绝语义（测试覆盖）；并将 `@logix/core/EffectOp` 的 Middleware 错误通道允许叠加 `OperationRejected`                        | 已覆盖（但需补文档）                                                |
| 001a EffectOp 命名/分型 | 001a reference 中对 trait 步骤的示例命名（如 `computed:update` / `link:propagate`）与 kind 归类（state/service）         | 当前实现将 trait 事件分为 `kind = "trait-computed"                                                                                                             | "trait-link"                                                        | "trait-source"`，并在 Devtools 中按 kind 展示；与 001a reference 示例存在差异 | 需修订（以当前实现为准更新 001a reference） |
| txnId 贯穿 trait 步骤   | 001a FR-023：同一事务内的每个 trait 步骤产生独立 EffectOp 事件，并共享同一 `txnId`（用于 Devtools 重建事务内演进）       | 当前总线能补齐 `txnId`（在 StateTransaction 活跃时），但 Trait 步骤级 EffectOp 目前更偏向用 `linkId` 串联；对“txnId 贯穿每个 trait 步骤”的严格承诺尚未完全固化 | 延期（锚点：003-trait-txn-lifecycle / StateTransaction 可视化完善） |

### 处理结论

- **已覆盖**：统一总线、注入方式、组合语义、Trait 接缝、Guard 拒绝语义。
- **需修订**：将 001a reference 中关于 trait 步骤的 kind/name 示例更新为当前实现（trait-\* 分型 + 事件命名规则）。
- **延期**：trait 步骤与 `txnId` 的严格对齐（以及基于 txnId+patch 的事务内演进可视化），归入后续主题集中收敛。
