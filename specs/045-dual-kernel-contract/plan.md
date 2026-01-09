# Implementation Plan: 045 Dual Kernel Contract（当前内核 + core-ng）

**Branch**: `045-dual-kernel-contract` | **Date**: 2025-12-27 | **Spec**: `specs/045-dual-kernel-contract/spec.md`
**Input**: Feature specification from `specs/045-dual-kernel-contract/spec.md`

## Summary

目标：把“内核替换/重写”从一次性大工程，降维为一套**稳定 Kernel Contract + 可证据化的切换门槛**。

规划裁决（核心）：

1. `@logixjs/core` 继续作为唯一对外入口：负责对外 API/语义、统一最小 IR、稳定标识、诊断档位语义与“内核装配点”。
2. `@logixjs/core-ng` 作为**另一套内核实现包**：只实现 `@logixjs/core` 定义的内核契约（Runtime Services/Kernel），通过 Layer/装配注入成为可选内核。
3. `@logixjs/react` 只依赖 `@logixjs/core`：它消费的是“已装配完成的 runtime”，不需要依赖 `@logixjs/core-ng`；业务侧切换内核仅发生在 runtime 创建/装配阶段。
4. 多内核“共存”只作为迁移与验证手段：允许同进程创建多个 runtime（各自一棵 DI 树），用于对照/灰度/试运行；不追求跨内核共享实例。
5. 性能与可诊断性以 `$logix-perf-evidence` 为硬门：任何抽象层引入的额外开销必须可复现、可量化，并在预算内。

## Existing Foundations（本特性直接复用的“现成地基”）

本特性不会另起一套“内核选择协议”。在实现层面，Kernel Contract 优先以 `@logixjs/core` 已有的 RuntimeServices（RuntimeKernel）机制表达：

- **RuntimeServices selection + evidence**：`packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`
  - serviceId → implId 的选择逻辑（含 runtime_default/provider/instance scopes）
  - 可序列化的 RuntimeServicesEvidence（用于 TrialRun/Evidence/Devtools 解释链路）
- **构造期一次性选择（热路径零分支）**：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
  - 当前已存在的可替换 serviceId：`txnQueue` / `operationRunner` / `transaction` / `dispatch`
- **React 适配层只消费 runtime**：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
  - 只吃 `ManagedRuntime`（天然满足“切换发生在 runtime 装配阶段”）

因此，045 的实现阶段重点是把“core-ng 能以独立包提供实现代码”这一点，补齐为可注入装配点与可解释证据（而不是在热循环里动态分发）。

## Deepening Notes

- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT，交付结论以 `profile=default`（或 `soak`）且 `comparable=true && regressions==0` 为硬门（source: spec clarify AUTO）
- Decision: 045 的 perf baseline 语义为“代码前后”（默认内核选择以当时 `Runtime.make` 的裁决为准；默认切换/迁移口径由 048 裁决），用于证明契约/装配层不引入热路径回归（source: spec clarify AUTO）
- Decision: before/after 必须隔离采集（独立 worktree/目录），混杂改动结果仅作线索（source: spec clarify AUTO）
- Decision: Gate baseline 以 `diagnostics=off` 为准；light/full 仅用于开销曲线与解释链路验证（source: spec clarify AUTO）

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM）  
**Primary Dependencies**: `effect` v3（workspace override 3.19.13）、pnpm workspace、`@logixjs/*`  
**Storage**: N/A（内存态：Effect Context/Scope + Ref/SubscriptionRef）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（React 运行环境）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- 默认路径（仅当前内核）不回归：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT；交付结论必须 `profile=default`（或 `soak`），且 `pnpm perf diff` 满足 `meta.comparability.comparable=true` 且 `summary.regressions==0`。
- 诊断关闭（off）额外开销接近零；诊断开启（light/full）事件 Slim 且可序列化，并有预算闸门。
- 内核选择/注入必须是“创建时决定、热路径零分支”：禁止在事务/收敛循环里做动态分发。

**Constraints**:

- 统一最小 IR（Static IR + Dynamic Trace），禁止并行真相源。
- 稳定标识去随机化：`instanceId/txnSeq/opSeq` 等锚点必须可复现。
- 事务窗口禁 IO/async；禁止写逃逸（业务不可写 SubscriptionRef 等）。
- 内部协作协议必须通过可注入契约表达（Runtime Services），避免 `runtime.__*` 扩散与参数爆炸。

**Scale/Scope**:

- 本特性重点在“装配/契约/切换门槛”，不直接承诺任何算法级优化收益。
- 预计触及 `@logixjs/core` 的 Runtime 装配与内部服务边界；`@logixjs/react` 以“只吃 runtime”保持稳定。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=引入 Kernel Contract/装配点改动前，after=改动后；默认内核以当时 `Runtime.make` 的裁决为准；对照实验需显式固定 `kernelId`，避免混入 baseline）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索不得用于宣称 Gate PASS
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

**Collect (Browser / matrix P1 minimal)**:

- `pnpm perf collect -- --profile default --out specs/045-dual-kernel-contract/perf/before.browser.<sha|worktree>.<envId>.default.json`
- `pnpm perf collect -- --profile default --out specs/045-dual-kernel-contract/perf/after.browser.<sha|worktree>.<envId>.default.json`
- `pnpm perf diff -- --before specs/045-dual-kernel-contract/perf/before.browser...json --after specs/045-dual-kernel-contract/perf/after.browser...json --out specs/045-dual-kernel-contract/perf/diff.browser.before...__after....json`

**Collect (Node / converge.txnCommit)**:

- `pnpm perf bench:traitConverge:node -- --profile default --out specs/045-dual-kernel-contract/perf/before.node.<sha|worktree>.<envId>.default.json`
- `pnpm perf bench:traitConverge:node -- --profile default --out specs/045-dual-kernel-contract/perf/after.node.<sha|worktree>.<envId>.default.json`
- `pnpm perf diff -- --before specs/045-dual-kernel-contract/perf/before.node...json --after specs/045-dual-kernel-contract/perf/after.node...json --out specs/045-dual-kernel-contract/perf/diff.node.before...__after....json`

Failure Policy：若 diff 出现 `stabilityWarning/timeout/missing suite` 或 `comparable=false` → 禁止下硬结论，必须复测（profile 升级或缩小子集）并在 `specs/045-dual-kernel-contract/quickstart.md` 标注结论不确定性。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性把“内核”显式化为 Runtime Services/Kernel Contract；上层 DSL/Module/Logic 写法保持为输入侧（Flow/Logix），内核只负责执行与观测（Runtime）。
- **Docs-first & SSoT**：观测协议以 `specs/005-unify-observability-protocol/` 为裁决；稳定身份与可序列化以 `specs/016-serializable-diagnostics-and-identity/` 为裁决；运行时装配与 scope 语义以 `docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md` 为裁决。
- **Contracts**：本特性会新增/固化“内核选择/装配点”的内部契约（Kernel Contract/Runtime Services），并要求能通过现有 Debug/Observability 链路解释当前生效内核。
- **IR & anchors**：不改变“统一最小 IR”原则；如需新增字段，只能作为 Static IR 摘要字段或 Dynamic Trace 的 Slim 字段扩展，并必须可序列化且可裁剪。
- **Deterministic identity**：继续使用稳定 `instanceId/txnSeq/opSeq`；禁止随机/时间作为默认主锚点来源。
- **Transaction boundary**：内核替换不引入事务内 IO/async；任何异步必须发生在事务窗口外，并有可解释诊断。
- **Internal contracts & trial runs**：所有内核实现必须可在 RunSession/TrialRun 下隔离、可 Mock、可导出证据；不得依赖进程级全局单例作为正确性必需依赖。
- **Performance budget**：装配层抽象必须做到热路径零分支；并通过 `$logix-perf-evidence` 把“无回归”固化为门槛。
- **Diagnosability & explainability**：必须能解释“当前用了哪个内核、来源是什么、是否发生回退/降级”，并且 off 档位近零成本。
- **User-facing performance mental model**：若引入“内核选择/回退策略”，必须给出 ≤5 关键词心智模型与可行动排障字段（避免口径漂移）。
- **Breaking changes**：允许轻量迁移，但不引入长期兼容层；迁移说明必须写入对应 spec 的 plan/tasks（以迁移文档替代兼容期）。
- **Public submodules**：若新增 `packages/logix-core-ng`，必须遵守 public submodules 规范（`src/index.ts` + 顶层 PascalCase 子模块；internal 不对外导出）。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；涉及浏览器证据时增加一次 headless browser perf run（由 `$logix-perf-evidence` 统一口径）。

### Gate Result (Pre-Design)

- PASS（本次产物为规划/契约层；具体实现与证据门槛在 Phase 2 tasks 中固化）。

### Gate Result (Post-Design)

- PASS（已产出 `research.md`/`data-model.md`/`contracts/*`/`quickstart.md`，且未引入第二套协议或事务边界破坏；后续实现阶段的所有变更必须继续以 `$logix-perf-evidence` 与可序列化证据作为门槛）。

## Project Structure

### Documentation (this feature)

```text
specs/045-dual-kernel-contract/
├── spec.md
├── plan.md              # This file ($speckit plan output)
├── research.md          # Phase 0 output ($speckit plan)
├── data-model.md        # Phase 1 output ($speckit plan)
├── quickstart.md        # Phase 1 output ($speckit plan)
├── contracts/           # Phase 1 output ($speckit plan)
└── tasks.md             # Phase 2 output ($speckit tasks - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/Runtime.ts
├── src/Observability.ts
├── src/Debug.ts
└── src/internal/runtime/**                # Kernel Contract/Runtime Services 装配点（实现阶段落点；含 RuntimeKernel）

packages/logix-core-ng/                     # NEW（实现阶段新增）
├── src/index.ts
└── src/*                                   # core-ng 的内核实现（仅实现契约，不复制对外 DSL）

packages/logix-react/
└── src/internal/provider/RuntimeProvider.tsx  # 只消费 runtime；不直接依赖 core-ng
```

**Structure Decision**:

- `@logixjs/core` 负责：对外 API + Kernel Contract + 默认内核实现；并提供“可注入装配点”。
- `@logixjs/core-ng` 负责：作为可选依赖提供另一套内核实现 Layer；不复制对外 DSL。
- `@logixjs/react` 负责：消费 runtime（ManagedRuntime）并提供 React 绑定；业务通过“创建 runtime 时选择内核”完成切换。

## Complexity Tracking

无（本阶段不引入宪法违例；多内核共存仅用于迁移验证，且不要求共享实例/DI 树）。

## Deliverables by Phase

- **Phase 0（research）**：`research.md` 收敛关键裁决：是否需要更底层 contract 包、core/core-ng/react 依赖拓扑、切换门槛与证据口径。
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`，把“Kernel Contract 与证据/验证入口”固化为可落地的结构。
- **Phase 2（tasks）**：由 `$speckit tasks 045` 生成（本阶段不产出）。

## After 045（作为分支点的后续路线）

045 完成实现后，下一步不建议“直接全量重写内核”，而是沿两条主线并行推进（并保持证据门禁）：

1. **把当前内核做到“够硬”**：以 `specs/039-trait-converge-int-exec-evidence/` 打通整型执行链路与证据达标（纯优化不改语义），让你可以放心继续做平台与上层生态。
2. **并行推进 core-ng**：在 045 固化的 Kernel Contract 与对照验证 harness 之上，让 `@logixjs/core-ng` 逐步覆盖更多 runtime services；每一次关键切换都必须通过 `$logix-perf-evidence` 的 Node+Browser before/after/diff 与结构化差异报告。

更长线的 NG 方向（AOT / Flat Memory / Wasm Planner）以 topic 草案为探索入口，统一收敛到：`docs/specs/drafts/topics/logix-ng-architecture/`（不作为裁决，裁决以新的 `specs/<NNN-*>/` 交付）。

更细致的 “After 045” 里程碑与切换门槛见：`specs/046-core-ng-roadmap/roadmap.md`。
