# Implementation Plan: 065 core-ng 整型化 Phase 2（事务/录制 id-first）

**Branch**: `065-core-ng-id-first-txn-recording` | **Date**: 2025-12-31 | **Spec**: `specs/065-core-ng-id-first-txn-recording/spec.md`  
**Input**: `specs/065-core-ng-id-first-txn-recording/spec.md`

## Summary

在不改变对外语义的前提下，把整型化从 converge 热路径扩展到 **txn dirty-set / patch recording / state:update 诊断链路**，形成 **id-first（FieldPathId/StepId）** 的端到端闭环；字符串仅在 **序列化/显示** 边界 materialize。交付内容包含：

- txn 热路径：dirty-set 与 patch recording 以整型锚点驱动，禁止 split/join 往返与隐式降级；
- 可解释链路：diagnostics=light/full 输出 Slim 且可序列化的 id 锚点，可基于 Static IR（`staticIrDigest`）反解为可读摘要；
- 长期门禁：Browser perf matrix + Node bench 的 before/after 证据与 hard gates，默认 `comparable=true && regressions==0 && budgetViolations==0` 才允许合入。

## Deepening Notes

- Decision: `FieldPathId` 唯一语义来源为 `ConvergeStaticIrExport.fieldPaths` 下标（以 `staticIrDigest` 对齐）(source: spec clarify AUTO)
- Decision: `StepId` 指 `ConvergeStepId`（converge steps table 整数下标；非 converge patch 不填）(source: spec clarify AUTO)
- Decision: dirty-set 对外形态为 `{ dirtyAll, reason? } | { rootIds, rootCount, keyHash, keySize }`，`rootIds` 必须 prefix-free 且稳定排序 (source: spec clarify AUTO)
- Decision: `rootPaths` 仅在显示/序列化边界反解；当 `staticIrDigest` 缺失或不匹配时不得反解（避免展示错误信息）(source: spec clarify AUTO + review)
- Decision: diagnostics bounded：`rootIds` TopK（light=3、full=32）+ `rootIdsTruncated`；full patch records ≤256（超限必须裁剪并可解释）(source: spec clarify AUTO)
- Decision: `DirtyAllReason`/`PatchReason` 必须稳定枚举（`PatchReason` 允许 `unknown` 兜底）(source: spec clarify AUTO)
- Decision: Hard gates 覆盖 Browser `converge.txnCommit`/`form.listScopeCheck` + Node `bench:027:devtools-txn`/`bench:009:txn-dirtyset` (source: spec clarify AUTO)
- Decision: string path 仅用于无歧义 dot-separated 边界输入；无法映射必须 `dirtyAll=true` 且 `reason=fallbackPolicy` (source: spec clarify AUTO)

## Execution Order（分阶段落地，便于先拿收益再扩展）

1. Txn DirtySet（id-first roots）：先把 commit/调度所需的 roots 证据切到 `rootIds`，确保“热路径 zero string roundtrip”与 `dirtyAll+reason` 显式降级。
2. Patch Recording（id-first + bounded）：再把 full 诊断下的 patch records 切到 `pathId/stepId` 并加上 `maxPatches=256` 裁剪标记。
3. Devtools 反解与展示：补齐 `staticIrDigest` 对齐与“不匹配不反解”的消费逻辑（保持只依赖 IR + Debug 事件，不读内部对象图）。
4. Hard Gates：最后把 Browser matrix + Node bench 门禁跑通并固化为合入硬门（任何 `comparable=false` 视为 FAIL）。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js v22.21.1  
**Primary Dependencies**: `effect@3.19.13`（pnpm override）、`pnpm@9.15.9`、`vitest@4.0.15`、`playwright@1.57.0`、`oxfmt`/`oxlint`/`eslint`、`turbo`、`@logix/core`/`@logix/core-ng`（workspace）  
**Storage**: N/A（纯运行时/证据落盘为文件）  
**Testing**: `pnpm test`（`vitest run`；禁止 watch）、Effect-heavy 用例优先 `@effect/vitest`；Browser perf 用 Vitest Browser（Playwright）  
**Target Platform**: Node（perf/node bench + devtools evidence）+ Chromium headless（browser perf matrix）  
**Project Type**: pnpm workspace monorepo（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:
- txn/commit 热路径避免字符串 split/join 往返；id-first 仅做 O(1) 查表/短循环；
- diagnostics=off 近零成本（不做 JSON 投影/不 materialize 可读路径；事件可被短路丢弃）；
- hard gates：browser `pnpm perf diff` 的 `comparable=true && regressions==0 && budgetViolations==0`；node bench 的 gate/阈值不得回退。  
**Constraints**:
- 事务窗口禁止 IO/await；违反必须稳定诊断（已有 `state_transaction::async_escape` 机制，新增逻辑不得绕过）；
- 稳定标识：`instanceId/txnSeq/opSeq` 可重建；禁止随机/时间作为默认唯一 id；
- 诊断事件必须 Slim & 可序列化 & 有界（超限必须裁剪并给出稳定 downgrade/reasonCode）。  
**Scale/Scope**: 典型：`steps=200~2000`、`dirtyRootsRatio=0.5%~75%`（对齐 browser matrix `converge.txnCommit`）。

## Constitution Check

_GATE：必须在 Phase 0/1 设计完成后再次复核；本计划在本阶段直接给出最终设计落点与复核结论。_

### 1) Intent → Flow/Logix → Code → Runtime 映射

- Intent/Flow 层无新增 DSL：本特性是 **Runtime 内核/证据链路** 的结构化优化（id-first + hard gates）。
- 影响面集中在：
  - txn：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - runtime commit：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - path/id：`packages/logix-core/src/internal/field-path.ts`
  - devtools export：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - core-ng evidence：`packages/logix-core-ng/src/ExecVmEvidence.ts`
  - perf gates：`.codex/skills/logix-perf-evidence/scripts/*` + `scripts/perf.ts`

### 2) 依赖/修改的 SSoT（docs-first）

- 方法论/术语基线：`docs/specs/sdd-platform/ssot/foundation/02-glossary.md`
- Runtime SSoT 导览：`.codex/skills/project-guide/references/runtime-logix/README.md`
- Trait 静态治理与溯源（Static IR digest / 锚点）：`.codex/skills/project-guide/references/runtime-logix/logix-core/impl/05-trait-provenance-and-static-governance.md`
- Perf evidence 与门禁口径：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`
- 本特性实现后需要回写（避免事实源漂移）：
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/impl/README.md`（新增：txn recording id-first、PatchReason/DirtyAllReason 收敛、state:update payload 约束与成本模型）

### 3) Effect/Logix 契约变化（Contracts）

- **InternalContracts**：`packages/logix-core/src/internal/InternalContracts.ts#recordStatePatch` 当前 `reason: string` 且 `StateTransaction.PatchReason` 允许自由字符串；本特性收紧为稳定枚举（见 `data-model.md`/`contracts/*`），并定义降级/裁剪策略。
- **RuntimeInternalsTxn**：`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts#RuntimeInternalsTxn.recordStatePatch` 将作为统一入口，承载 id-first patch recording（`pathId`/`stepId` 等）并避免调用方走 string-path 往返。

### 4) IR & Anchors（统一最小 IR / Platform-Grade 子集）

- 统一最小 IR 不新增第二套真相源：所有 id（`FieldPathId/StepId`）都必须能在 **Static IR（`staticIrDigest`）** 下反解。
- state/update 与 trait/converge 事件的锚点对齐：state/update 增补 `staticIrDigest`（或等价锚点）以便 Devtools 在不读运行时内部状态的前提下反解 dirty roots。

### 5) Deterministic Identity（稳定标识）

- txn 侧：`instanceId` 外部注入；`txnSeq` 单调；`txnId` 可由 `(instanceId, txnSeq)` 重建（现状：`StateTransaction.beginTransaction`）。
- patch 侧：本特性补齐/固化 `opSeq`（事务内单调）并在 full 诊断下保留有序 patch 序列；light/off 不产生重载荷但仍保持统计摘要可解释。
- event 侧：继续沿用 DebugSink 的 `eventSeq`（如已有）或保持现有事件排序机制，不引入随机化。

### 6) Transaction Boundary（事务窗口禁止 IO）

- 事务窗口内不得引入任何 async/IO；id-first 的 registry 查表必须是纯内存操作（build/install 期构建、txn 期只读）。
- 违反同步窗口的行为必须保持既有诊断（`state_transaction::async_escape`），且新增链路不得“吞错/静默回退”。

### 7) Internal Contracts & Trial Runs（DIP/可替换）

- 新增/修改的 registry/映射能力必须通过 `RuntimeInternals`/注入服务提供（每 runtime 实例隔离），禁止进程级单例。
- Devtools/Perf 证据输出只依赖 Debug 事件与 IR 导出，不直接读取内部对象图（避免并行真相源）。

### 8) Dual Kernels（core + core-ng 支持矩阵）

- `@logix/core`：提供 txn recording、dirty-set、Debug 事件投影与导出（包含 id-first 锚点字段）。
- `@logix/core-ng`：只提供 `trace:exec-vm` evidence（`packages/logix-core-ng/src/ExecVmEvidence.ts`）；由 core 的 DebugSink 统一裁剪/序列化成本。
- Gate：browser perf matrix 通过 `VITE_LOGIX_PERF_KERNEL_ID` 支持 core/core-ng 复跑；不得要求业务/消费者直接 import `@logix/core-ng` 才能触发 core 的 gate。

### 9) Performance Budget（热路径与回归防线）

- 触及热路径：
  - dirty-path 记录：`StateTransaction.recordDirtyPath`（写入频次最高）
  - commit 聚合：`StateTransaction.commit` + `ModuleRuntime.transaction` 的 `state:update`
  - devtools 投影：`DebugSink.toRuntimeDebugEventRef`（必须可短路）
- 回归防线：
  - Browser：`pnpm perf collect` + `pnpm perf diff`（matrix `converge.txnCommit` 为 P1）
  - Node：`pnpm perf bench:027:devtools-txn`（devtools hub record + txnQueue）与必要的 txn-dirtyset microbench（见下方 Perf Evidence Plan）

### 10) Diagnosability & Explainability（诊断事件与成本）

- diagnostics=off：不输出 id→path 的反解结果；state:update 等高频事件应尽可能被短路（无 sinks 时直接丢弃）。
- diagnostics=light：保留最小摘要（`patchCount`、`dirty.rootIds` TopK=3、`rootIdsTruncated`、`dirtyAll+reason`、必要锚点如 `staticIrDigest/instanceId/txnSeq/opSeq`），不得携带 `from/to` 等重字段。
- diagnostics=full：允许输出可序列化的 patch records（默认最多 256 条；超限必须裁剪并标记 `patchesTruncated=true` 且 `patchesTruncatedReason="max_patches"`），`dirty.rootIds` TopK=32 并携带 `rootIdsTruncated`；仍需保证 payload Slim & 可序列化（不可序列化字段必须省略/裁剪）。
- Devtools/Sandbox/平台消费侧：当 `staticIrDigest` 缺失或不匹配时，必须不反解 `rootIds → rootPaths`（避免展示错误信息），仅展示 id 与摘要字段。

### 11) 用户侧性能心智模型（≤5 关键词）

`id-first` / `dirtyAll` / `diagnosticsLevel(off|light|full)` / `staticIrDigest` / `hard-gates`

### 12) Breaking Changes（只前进，不做兼容层）

- 可能的破坏性变化（计划内）：`StateTransaction.PatchReason` 从“允许自由字符串”收紧为稳定枚举；state:update 的 `dirtySet` payload 结构从 path-first 迁到 id-first。
- 迁移说明落点：`specs/065-core-ng-id-first-txn-recording/quickstart.md`（调用方改造指引）+ runtime impl README（SSoT 回写）。

### 13) Public Submodules（exports 不泄漏 internal）

- 预期仅改动 `packages/logix-core/src/internal/**` 与 `packages/logix-core-ng/src/**` 的内部实现与内部契约；
- 不新增 `packages/*/src/*.ts` 顶层子模块；如需对外暴露能力，必须先在 SSoT 评审后再进入实现。

### 14) Quality Gates（合入前必须通过）

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`
- Perf gates：按下方 Perf Evidence Plan 产出 before/after + diff，且门禁判定 PASS（browser `comparable=true && regressions==0 && budgetViolations==0`）。

## Perf Evidence Plan（MUST）

### Baseline 语义

- **代码前后（before/after）**：before=开始实现 065 前的 HEAD；after=完成实现并通过 gates 的 HEAD。

### envId / matrixId

- Browser perf 以 `.codex/skills/logix-perf-evidence/assets/matrix.json#id` 作为主锚点（当前为 `logix-browser-perf-matrix-v1`），环境以 report 内 `meta.env` 为准。
- Node bench 以 `process.version + platform/arch` 为环境锚点，必要时补充 `cpu`（可在 `collect` 报告中自动采集）。

### Browser（matrix）证据

- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/065-core-ng-id-first-txn-recording/perf/browser.before.<sha>.logix-browser-perf-matrix-v1.default.json --files test/browser/perf-boundaries`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/065-core-ng-id-first-txn-recording/perf/browser.after.<sha>.logix-browser-perf-matrix-v1.default.json --files test/browser/perf-boundaries`
- diff（硬门）：
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out specs/065-core-ng-id-first-txn-recording/perf/diff.browser.before.<sha>__after.<sha>.json`
  - 判定：`meta.comparability.comparable=true` 且 `summary.regressions==0`（并同时要求 `summary.budgetViolations==0`）。
- 重点关注 suites：
  - `converge.txnCommit`（P1，直接覆盖 txn commit/decision 热路径）
  - `form.listScopeCheck`（P2，覆盖 diagnosticsLevel=off/light/full 的开销曲线）

### Node（bench）证据

- Devtools/txn 基线（自带 gate 输出）：
  - `OUT_FILE=specs/065-core-ng-id-first-txn-recording/perf/node.after.<sha>.bench027.r1.json pnpm perf bench:027:devtools-txn`
  - 判定：`gate.ok=true` 且关键摘要（txnQueue p95 / devtoolsHubRecord p95）不回退。
- txn dirty-set microbench（用于捕捉“path→id 映射/去字符串”收益）：
  - `NODE_ENV=production OUT_FILE=specs/065-core-ng-id-first-txn-recording/perf/node.after.<sha>.bench009.convergeMode=dirty.json RUNS=30 WARMUP_DISCARD=5 STEPS=200 INSTRUMENTATION=light CONVERGE_MODE=dirty pnpm perf bench:009:txn-dirtyset`
  - 同一配置下保存 before/after 两份文件，以相对回归阈值 ≤15% 做判定（`medianMs` 与 `p95Ms` 两者同时满足）。

### Failure Policy

- Browser diff 若出现 `timeout/failed/missing suite` 或 `comparable=false`：
  - 先缩小 `--files` 子集到 `test/browser/perf-boundaries`；
  - 必要时升档 `--profile soak` 复测；
  - `diff:triage`（允许 drift）只能用于定位与解释，不能作为 hard gate 的最终结论。
- Node bench 若波动不可判定：提升 RUNS/WARMUP 或在同环境下重复 3 次取最差值，并记录为证据备注（不允许“挑最好的一次”）。

## Project Structure

### Documentation（this feature）

```text
specs/065-core-ng-id-first-txn-recording/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── schemas/
│       ├── converge-static-ir.schema.json
│       ├── txn-dirty-root-ids.schema.json
│       ├── txn-patch-record.schema.json
│       ├── debug-state-update.schema.json
│       └── exec-vm-evidence.schema.json
└── tasks.md               # Phase 2 output ($speckit tasks)
```

### Source Code（repository root）

```text
packages/logix-core/src/internal/
├── field-path.ts
├── InternalContracts.ts
└── runtime/core/
    ├── RuntimeInternals.ts
    ├── StateTransaction.ts
    ├── ModuleRuntime.transaction.ts
    └── DebugSink.ts

packages/logix-core/src/internal/state-trait/
├── build.ts               # FieldPathIdRegistry / StepId 表（build 期）
└── converge-ir.ts         # staticIrDigest（对齐锚点）

packages/logix-core-ng/src/
└── ExecVmEvidence.ts

.codex/skills/logix-perf-evidence/scripts/
├── collect.ts
├── diff.ts
├── 009-txn-patch-dirtyset.txn-dirtyset-baseline.ts
└── 027-runtime-observability-hardening.devtools-and-txn-baseline.ts
```

**Structure Decision**: 本特性为“运行时内核/证据链路”改造，落点只在 `packages/*` 与 perf evidence scripts，不新增 app/web 工程结构。

## Complexity Tracking

N/A（不引入额外工程层级；复杂度来自热路径约束与证据门禁，已通过 Perf Evidence Plan 固化）。
