# Implementation Plan: 050 core-ng 整型桥（Integer Bridge）

**Branch**: `050-core-ng-integer-bridge` | **Date**: 2025-12-27 | **Spec**: `specs/050-core-ng-integer-bridge/spec.md`  
**Input**: Feature specification from `specs/050-core-ng-integer-bridge/spec.md`

## Summary

目标：把整型化从“计划层/注册表”打穿到“事务流水线/执行 loop”，做到：

- 源头零拷贝（path segments 透传）
- light 下 argument-based recording（调用点零对象分配）
- 执行层 id 驱动访问器与计划（禁止 id→string→split）
- 证据门禁拦截半成品态负优化（Node + Browser before/after/diff）

本 plan 只固化硬门与落点；实现/证据进度以 `specs/050-core-ng-integer-bridge/tasks.md` 与 `specs/050-core-ng-integer-bridge/quickstart.md` 为准。

## Current State & Gap（截至 039）

- converge 已是 `FieldPathId/StepId` + TypedArray 驱动（Exec IR），dirty roots 也可通过 `FieldPathIdRegistry` 映射（避免 split）。
- 事务层 `StateTransaction.commit` 仍会将 `dirtyPaths` 规范化后 `join('.')` 输出 `DirtySet.paths: ReadonlyArray<string>`；因此 050 的关键补齐点是把 dirty-set/commit 输出改为“无往返表示”，并把字符串 materialize 限制在序列化/显示边界。
- 本 spec 聚焦“表示与可解释链路”的打穿；分配行为与 off 档位闸门分别由 `051/052` 收口（见 `specs/046-core-ng-roadmap/spec-registry.md` 的 P1 边界表）。

## Deepening Notes

- Decision: perf evidence 以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT，交付结论以 `profile=default`（或 `soak`）且 `comparable=true && regressions==0` 为硬门（source: spec clarify AUTO）
- Decision: perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；结论存疑时必须复测（source: spec clarify AUTO）
- Decision: 动态/异常路径允许存在，但必须显式降级 `dirtyAll=true` + `DirtyAllReason` 且在 Perf Gate 覆盖场景中视为 FAIL（source: spec clarify AUTO）
- Decision: diagnostics=light/sampled/full 允许 materialize 可读映射，但不得落在 txn hot loop；off 下不 materialize（source: spec clarify AUTO）
- Decision: bitset 清零默认用简单策略（如 `fill(0)`），只有证据显示清零主导才引入更复杂优化（source: spec clarify AUTO）
- Decision: 半成品态（id→string→split / split/join 往返）必须有守护测试/微基准兜底，出现即 Gate FAIL（source: spec clarify AUTO）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、（实现阶段）`@logixjs/core-ng`  
**Storage**: N/A（证据落盘到 `specs/050-core-ng-integer-bridge/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（必须含 ≥1 headless browser evidence）  
**Project Type**: pnpm workspace  
**Performance Goals**: 以 perf matrix 的 P1 suites 为硬门（`profile=default`/`soak` + `comparable=true && regressions==0`），并争取在关键点位获得可证据化收益（推荐 `p95` 下降 ≥20% 或 heap/alloc 明显改善）  
**Constraints**: 统一最小 IR + 稳定锚点；事务窗口禁 IO；diagnostics=off 近零成本；禁止半成品默认化；consumer 不直接依赖 core-ng  
**Scale/Scope**: 优先 converge/txn/dirtyset；其它路径扩面由后续 specs 管理

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性只改变 Runtime 内部执行与数据表示，不改变业务 DSL/Flow。
- **Docs-first & SSoT**：复用 039 的 guardrails 与 `$logix-perf-evidence` 口径；复用 045 的契约跑道；不引入并行协议。
- **Contracts**：可能需要放宽内部契约（txn/patch/path 表示），必须以显式 Runtime Services/类型定义表达，并保持 consumer 只依赖 core。
- **IR & anchors**：保持统一最小 IR；id 映射只作为实现工件与可选摘要字段，不得导致锚点漂移。
- **Deterministic identity**：id 分配与映射必须可解释且可复核；禁止随机/时间默认锚点。
- **Transaction boundary**：事务窗口内禁 IO/async；整型化不引入写逃逸。
- **Internal contracts & trial runs**：必须能被 TrialRun/对照 harness 复核；失败必须结构化输出。
- **Dual kernels (core + core-ng)**：
  - kernel support matrix（本 spec）：core=`supported`（可能需要契约放宽）、core-ng=`trial-only → supported`（以证据达标裁决）。
  - consumer 不直接依赖 `@logixjs/core-ng`。
- **Performance budget**：必须 Node + Browser 证据门禁，阻断负优化。
- **Diagnosability & explainability**：off 近零成本；light/sampled/full 才输出 id 映射摘要（Slim、可序列化）。
- **Breaking changes**：对业务对外语义保持不变；如影响对外行为必须另立 spec 并写迁移说明。
- **Public submodules**：实现阶段新增导出点遵守 public submodules。
- **Quality gates**：实现阶段至少 `pnpm typecheck/lint/test` + perf evidence。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks）

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=改动前代码，after=改动后代码）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集环境：允许在 dev 工作区采集（可为 git dirty），但 before/after 必须 `meta.matrixId/matrixHash` 一致且 env/config 不漂移；如出现 `stabilityWarning` 或结果存疑，必须复测（必要时 `profile=soak`）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

**Collect (Browser / converge-only)**:

- `pnpm perf collect -- --profile default --out specs/050-core-ng-integer-bridge/perf/before.browser.converge.txnCommit.<sha>.<envId>.default.json --files test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm perf collect -- --profile default --out specs/050-core-ng-integer-bridge/perf/after.browser.converge.txnCommit.<sha|dev>.<envId>.default.json --files test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm perf diff -- --before specs/050-core-ng-integer-bridge/perf/before.browser.converge.txnCommit...json --after specs/050-core-ng-integer-bridge/perf/after.browser.converge.txnCommit...json --out specs/050-core-ng-integer-bridge/perf/diff.browser.converge.txnCommit.before...__after....json`

**Collect (Node / converge.txnCommit)**:

- `pnpm perf bench:traitConverge:node -- --profile default --out specs/050-core-ng-integer-bridge/perf/before.node.<sha>.<envId>.default.json`
- `pnpm perf bench:traitConverge:node -- --profile default --out specs/050-core-ng-integer-bridge/perf/after.node.<sha|dev>.<envId>.default.json`
- `pnpm perf diff -- --before specs/050-core-ng-integer-bridge/perf/before.node...json --after specs/050-core-ng-integer-bridge/perf/after.node...json --out specs/050-core-ng-integer-bridge/perf/diff.node.before...__after....json`

Failure Policy：若 diff 出现 `stabilityWarning/timeout/missing suite` 或 `comparable=false` → 禁止下硬结论，必须复测（profile 升级或缩小子集）并在 `specs/050-core-ng-integer-bridge/quickstart.md` 标注结论不确定性。

## Project Structure

### Documentation (this feature)

```text
specs/050-core-ng-integer-bridge/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
├── perf/
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/
├── src/internal/runtime/core/StateTransaction.ts
├── src/internal/field-path.ts
└── src/internal/state-trait/converge.ts

packages/logix-core-ng/
└── src/*                        # id 驱动的执行/访问器/txn 相关实现（通过 045 注入）
```

**Structure Decision**:

- 契约放宽与 id 口径优先落在 `@logixjs/core`（类型/证据出口）；core-ng 复用契约并提供实现。

## Design（关键机制与落点）

### 1) FieldPath：源头零拷贝 + 事务内禁往返

- 事务窗口内以 segments/FieldPath 透传；禁止 `join/split` 往返。
- canonical string 仅允许在事务外/证据与显示边界 materialize，并做缓存/摘要复用。

### 2) Id Registry：稳定、可解释、可复核

- 默认策略：优先在 module assembly/compile 阶段预注册静态 FieldPaths/Steps（保证可重复对齐），运行期只做 O(segments) 查表。
- 导出：light/full 下提供最小可序列化映射摘要（仅用于解释与 diff 对齐，不作为 primary anchor）。

### 3) DirtySet：动态/异常路径的显式降级

- 动态/异常路径允许存在，但必须显式 `dirtyAll=true` 并携带 `DirtyAllReason`（Slim、可序列化）。
- 在 perf gate 覆盖的场景中若出现该降级，视为 FAIL（必须先收敛/证据化再切默认）。

### 4) Bitset：先证据化再复杂化

- 默认先采用最简单策略（例如每次事务 `fill(0)` 清零），仅当 perf evidence 显示清零主导再引入更复杂的 touched-words 等优化。

### 5) Guardrails：半成品态禁止默认化

- 必须用测试/微基准守护：txn/exec 热循环内不得出现 `split/join` 往返或 `id→string→split`。

## Deliverables by Phase

- **Phase 0（research）**：明确 id registry 的稳定性策略、动态路径处理策略、bitset/清零策略与证据矩阵。
- **Phase 1（design）**：产出 `data-model.md`、`contracts/*`、`quickstart.md`（验证与证据落盘方式）。
- **Phase 2（tasks）**：由 `$speckit tasks 050` 维护（本阶段不产出）。

### Gate Result (Post-Design)

- PASS（已把 perf matrix/diff 门槛固化到 spec+plan；并把动态降级/诊断边界/bitset 策略写成可执行约束）
