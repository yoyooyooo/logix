# Implementation Plan: Process（长效逻辑与跨模块协同收敛）

**Branch**: `[012-program-api]` | **Date**: 2025-12-16 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/spec.md`  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

把“跨模块协作 + 长效运行逻辑”从分散形态（历史机制/入口）收敛为统一的 Process 概念，并以现有 `processes` 作为唯一运行承载：支持应用级/模块实例级/UI 子树三级作用域安装，统一触发模型、并发语义、错误策略与结构化诊断事件，并在严格作用域（只解析当前 scope）前提下保证多实例隔离、稳定标识与近零成本的可观测开关。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: effect v3、`@logixjs/core`（运行时主线）、`@logixjs/react`（UI 子树作用域安装）、Devtools/Sandbox（作为诊断事件消费方）  
**Storage**: 内存态（Effect Context/Scope + Ref/SubscriptionRef），不引入持久化存储  
**Testing**: Vitest + `@effect/vitest`（Effect-heavy 用例）；React 侧用 Testing Library（按既有用例风格）  
**Target Platform**: Node.js 20+（runtime/test/基准）+ modern browsers（React/Devtools 消费）  
**Project Type**: pnpm workspace monorepo（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: 以“动作分发→Process 触发判定/调度→跨模块驱动”为关键路径；在约定基线用例下引入 Process 后 p95 额外开销 ≤ 5%（诊断关闭时 ≤ 1%）；基线测量采用固定场景重复运行 30 次（丢弃 warmup）并记录 p50/p95 与分配计数（至少一类指标）  
**Constraints**: 稳定标识（禁止随机/时间默认 id）、事务窗口禁止 IO/await、跨模块影响必须通过动作协议、诊断事件 Slim 且可序列化、诊断关闭近零成本、packages 子包对外子模块铁律（030：对外子模块 PascalCase；hooks/components/worker 下沉 `src/internal/**`；`exports` 屏蔽 `./internal/*`）、拒绝向后兼容（迁移说明替代兼容层）  
**Scale/Scope**: 单进程多实例并存（同模块多 key/多会话）；同一作用域内可安装多个 Process（例如 0–50）；Devtools ring buffer 需有容量上限与裁剪策略

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

### Answers (Pre-Research)

- **Intent → Flow/Logix → Code → Runtime**：用户意图是表达“长期运行 + 跨模块协作”的业务规则；Process 作为声明/装配单元，降解为运行时容器中可安装的长生命周期 `processes`，并通过触发源监听 + 并发策略 + 错误策略 + 跨模块动作驱动实现协作；运行时在作用域生命周期内监督启停与诊断事件采集。
- **Docs-first & SSoT**：先对齐 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 中关于“模块/作用域/长效逻辑”的契约，再落地到 `packages/logix-core` 与 `packages/logix-react`；用户侧文档同步到 `apps/docs/content/docs/*`。
- **Contracts**：会新增/调整 Process 的对外契约（安装点、并发/错误策略、稳定标识、诊断事件）；协议以本特性的 `specs/012-program-api/contracts/*` 与 `data-model.md` 固化，并在实现前回写到 runtime SSoT（尤其 `core/09-debugging.md`）。
- **IR & anchors**：不引入第二套 IR；Process 的观测面作为 Dynamic Trace 的事件扩展，必须保持 Slim/可序列化，并以稳定标识串起“触发→调度→跨模块驱动”链路。
- **Deterministic identity**：Process 必须具备稳定 `processId`；其安装与运行实例必须可确定性派生标识（基于作用域锚点与单调序号），禁止默认随机/时间 id；该模型在 `data-model.md` 与 schema 中固化。
- **Transaction boundary**：Process 的长效任务可执行 IO，但不得发生在事务窗口内；跨模块驱动必须通过显式动作触发新的事务（不允许越界写入或事务内 await），违反边界必须稳定失败并可诊断。
- **Performance budget**：触及热路径包括触发判定、调度队列与事件记录；Phase 0 先建立可复现基线与测量方式（见 Performance Goals），Phase 2 实现中以基准对比阻止回退。
- **Diagnosability & explainability**：新增/对齐 Process 相关事件（start/stop/trigger/dispatch/error/restart 等）并保持事件载荷 Slim；诊断关闭近零成本，开启时成本需在 plan 与 contracts 中声明并可验收。
- **Breaking changes**：属于破坏性升级；迁移说明写入本特性的 `quickstart.md`，并同步更新 `docs/reviews/99-roadmap-and-breaking-changes.md` 与用户文档（不提供兼容层）。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；新增 Process 用例覆盖应用级/实例级/子树级启停、并发策略差异、缺失依赖错误、诊断事件与稳定标识。

## Project Structure

### Documentation (this feature)

```text
specs/012-program-api/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/Process.ts                                  # 新的公共入口（对外概念收口；基于 processes）
├── src/Link.ts                                     # Process.link(...) 的下沉实现/等价别名（跨模块胶水；原 Link.make）
├── src/internal/runtime/AppRuntime.ts               # 应用级 scope 下统一 fork processes（现有）
├── src/internal/runtime/ModuleRuntime.ts            # （新增/扩展）实例级 scope 下 fork processes（用于实例级安装点）
├── src/internal/runtime/core/DebugSink.ts           # Process 诊断事件（Slim/可序列化）
└── test/                                            # Process 语义/隔离/并发/错误策略用例

packages/logix-react/
├── src/RuntimeProvider.ts                           # UI 子树作用域边界（对外子模块）
├── src/Hooks.ts                                     # React hooks 对外子模块（含 useProcesses）
├── src/internal/provider/RuntimeProvider.tsx        # Provider 实现（internal）
├── src/internal/hooks/useProcesses.ts               # （新增）在 Provider scope 内安装 processes（子树级安装点；internal）
└── test/Hooks/                                      # hooks 回归用例（含 useProcesses；如需要扩展到 StrictMode/Suspense）

packages/logix-devtools-react/                       # Process 事件展示（如协议新增）
packages/logix-sandbox/                              # Process 事件/协议对齐（如需要）

.codex/skills/project-guide/references/runtime-logix/                            # SSoT（语义与契约）
apps/docs/content/docs/                              # 用户文档（产品视角）
examples/                                            # 可运行示例（验收/回归）
```

**Structure Decision**: Process 的核心语义与运行承载（`processes`）优先落在 `packages/logix-core`；UI 子树安装点落在 `packages/logix-react`；协议与文档以 `.codex/skills/project-guide/references/runtime-logix/*` 为主事实源并同步 `apps/docs` 与 `examples`。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

No violations identified for this feature at planning time.

## Phase Plan (Outputs)

### Phase 0 - Outline & Research

- 产出 `research.md`：明确 Process 的触发模型、并发策略最小集合与语义、错误策略与监督上限、稳定标识模型、诊断事件预算与测量方法，并给出备选方案与取舍。
- 明确迁移策略：把历史分散入口收敛为 Process，并定义“可批量替换”的迁移路径（无兼容层）。

### Phase 1 - Design & Contracts

- 产出 `data-model.md`：固化 Process Definition / Installation / Instance / Trigger / Diagnostics Event / Error Summary 的字段与关系，并给出关键状态转换。
- 产出 `contracts/`：以 OpenAPI 3.1 + JSON Schema 固化 Process 可观测协议（不暗示具体传输实现）。
- 产出 `quickstart.md`：提供最小接线方式、默认策略说明与迁移指引（应用级/实例级/子树级三种安装点）。
- 更新 agent context：运行 `/Users/yoyo/Documents/code/personal/intent-flow/.specify/scripts/bash/update-agent-context.sh codex`，同步本计划的技术上下文与目录结构。

### Phase 1 - Constitution Re-check (Post-Design)

- 确认 contracts 已固化稳定标识、事件 Slim/可序列化与预算上界；
- 确认事务边界（禁 IO/await）与跨模块写入纪律在需求/数据模型中可被验收；
- 确认性能基线与诊断开销的验收口径已明确；
- 确认 breaking change 的迁移说明已在 quickstart 与 reviews 证据中给出落点。

### Phase 2 - Implementation (Planning Only)

- Runtime：以 `processes` 为唯一承载补齐三类安装点（应用级/实例级/子树级），并统一错误策略与稳定标识模型（不引入 ProgramRuntime 这类新内核）。
- React：补齐 UI 子树级安装点（挂载即启、卸载即停），与 StrictMode/Suspense 行为对齐。
- Diagnostics：新增/对齐 Process 事件并接入 Devtools/Sandbox 的事件通道（默认关闭近零成本）。
- Tests：覆盖 AC-1..AC-7 场景；新增最小性能基线用例并记录对比结果。

## Constitution Re-check (Post-Design Results)

- **Contracts**：已在 `specs/012-program-api/contracts/openapi.yaml` 与 `specs/012-program-api/contracts/schemas/*` 固化 Process 的可序列化协议（含安装点、并发/错误策略、事件模型）。
- **Deterministic identity**：`specs/012-program-api/contracts/schemas/process-identity.schema.json` 与 `specs/012-program-api/contracts/schemas/process-instance-identity.schema.json` 固化 `processId + scope + runSeq` 作为稳定锚点；触发链路通过 `triggerSeq` 承接（见 `specs/012-program-api/contracts/schemas/process-trigger.schema.json`）。当触发源来自模块事务（moduleAction/moduleStateChange）时，Trigger 额外携带 `txnSeq`（可由 `instanceId + txnSeq` 确定性派生 `txnId`），满足宪章“诊断事件携带 moduleId + instanceId + txnId/等价集合”的硬约束。
- **Diagnosability budgets**：事件类型与字段已在 `specs/012-program-api/contracts/schemas/process-event.schema.json` 固化为 Slim/可序列化载荷；预算上界与裁剪要求在 `specs/012-program-api/data-model.md` 的 Budgets 中明确。
- **Transaction boundary**：事务窗口禁 IO/await 与“跨模块影响必须通过动作协议”已在 `specs/012-program-api/spec.md`（FR/NFR/Edge Cases）与 `specs/012-program-api/research.md`（Decision 3/4/5）固化。
- **Performance budget**：关键路径预算与基线口径已在 `specs/012-program-api/plan.md` 的 Technical Context 与 `specs/012-program-api/research.md`（Decision 8）明确；实现阶段按该口径复测。
- **Breaking changes**：迁移原则已写入 `specs/012-program-api/quickstart.md`；实现阶段需同步更新 `.codex/skills/project-guide/references/runtime-logix/*`、`apps/docs/content/docs/*` 与 `docs/reviews/99-roadmap-and-breaking-changes.md`（不提供兼容层）。
