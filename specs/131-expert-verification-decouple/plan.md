# Implementation Plan: Expert Verification Decouple

**Branch**: `131-expert-verification-decouple` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/131-expert-verification-decouple/spec.md`

## Summary

本计划把 expert verification decouple 收口成三条必须同时完成的主线：

1. 重新定义 owner：把 expert route、canonical route、shared primitive、observability backing 分成四类稳定角色
2. 抽离共享原语：把 `internal/reflection/**` 当前借用的 `trialRun`、`EvidencePackage`、`JsonValue`、artifact contract 等从 observability 命名层拆出
3. 锁死回流：通过 contract tests、grep gate、ledger 与 SSoT 回写，确保 `runtime.*` 继续是默认入口，`Reflection.verify*` 继续只保留 expert-only 身份

### Current-State Snapshot

- [Reflection.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection-api.ts) 已不再直接 import `internal/observability/*`
- [kernelContract.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/kernelContract.ts) 仍直接依赖 `../observability/trialRun.js`、`../observability/evidence.js`、`../observability/jsonValue.js`
- [fullCutoverGate.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/reflection/fullCutoverGate.ts) 仍直接依赖 `../observability/trialRun.js`
- `internal/reflection` 其他文件仍借用 `observability/jsonValue` 与 `observability/artifacts/exporter`
- 现有 [KernelReflectionSurface.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts) 只覆盖 public surface 与 control-surface helper，尚未覆盖整个 `internal/reflection/**` 边界

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Effect v4, Markdown
**Primary Dependencies**: `packages/logix-core/src/{Reflection.ts,Runtime.ts,Observability.ts,Kernel.ts}`, `packages/logix-core/src/internal/reflection/**`, `packages/logix-core/src/internal/observability/**`, `packages/logix-core/src/internal/runtime/core/**`, `packages/logix-core/test/{Contracts,Reflection*.test.ts,Runtime,observability,internal}/**`, `docs/ssot/runtime/09-verification-control-plane.md`, `specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}`
**Storage**: files / N/A
**Testing**: Vitest, targeted rg audit, `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`, `pnpm typecheck` on final route-affecting changes
**Target Platform**: Node.js 20+ + modern browsers
**Project Type**: pnpm workspace monorepo
**Performance Goals**: 默认不宣称新性能收益；若 shared primitive 抽取触及 canonical `Runtime.trial` 的行为路径，必须证明 targeted verification 链路无未解释回退
**Constraints**: forward-only；不新增公开 API；`runtime.*` 默认入口不变；`Reflection.verify*` expert-only 身份不变；`internal/reflection/**` 禁止继续直接 import `internal/observability/**`；shared primitive 必须有中性 owner；allowlist 默认预算为 0
**Scale/Scope**: `packages/logix-core/src/internal/{reflection,observability}` 为主，允许新增 `packages/logix-core/src/internal/{verification,protocol}`；同步触达 `packages/logix-core/test/**`、`docs/ssot/runtime/09-verification-control-plane.md`、`specs/130-runtime-final-cutover/**`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: PASS
  `spec.md`、`plan.md` 保持 NS-8 / NS-10 与 KF-8 / KF-9 一致。
- **Intent → Flow/Logix → Code → Runtime 链路**: PASS
  本特性不新增业务建模；它收口的是 `verification route → internal owner → runtime/evidence primitive → diagnostics contract` 这一段代码链路。
- **Docs-first & SSoT**: PASS WITH WRITEBACK
  必须先回写 `docs/ssot/runtime/09-verification-control-plane.md` 与 `specs/130-runtime-final-cutover` 的相关 ledger，再汇报实现闭环。
- **Effect / Logix contracts**: PASS WITH GATE
  不改公开 contract；允许重定义 internal owner。若共享原语从 observability 抽出，新的 owner 文档必须在本 spec 的 contracts/inventory 中写明。
- **IR & anchors**: PASS
  不改 minimal IR，也不改 `instanceId / txnSeq / opSeq` 语义；若 shared primitive 迁移涉及 trace digest 或 evidence summary，必须保持稳定可比。
- **Deterministic identity**: PASS
  任何 shared primitive 迁移不得把 `runId`、session identity 或 kernel contract anchor 拉回随机/time-based 生成。
- **Transaction boundary**: PASS
  本轮不得引入 txn window 内的 IO/async，也不得通过 shared primitive 抽取绕开既有约束。
- **React consistency (no tearing)**: PASS
  不触达 React 集成主路径。
- **External sources (signal dirty)**: PASS
  不引入新 external source 语义。
- **Internal contracts & trial runs**: PASS WITH GATE
  本轮正是为了解除 implicit collaboration：shared primitive 必须转成显式 owner，且可被 `reflection` 与 canonical trial 共同消费。
- **Dual kernels (core + core-ng)**: PASS
  expert verification 仍可验证 kernel contract，但消费者不得因此直接依赖 `core-ng`。
- **Performance budget**: PASS WITH ESCALATION
  默认不做性能结论。若改动触及 [trialRun.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRun.ts) 或其替代 shared owner 的运行语义，至少要补 targeted before/after verification evidence。
- **Diagnosability & explainability**: PASS
  抽 owner 不能让 evidence / trace / report 失去可解释性。
- **User-facing performance mental model**: PASS
  对外默认入口不变，不需要新增用户侧性能叙事；若 `docs/ssot/runtime/09` 中 owner 解释改变，必须保持用词稳定。
- **Breaking changes (forward-only evolution)**: PASS
  internal import path 和 owner 命名允许 breaking；不保留兼容 bridge。
- **Public submodules**: PASS
  公开出口仍经 `src/index.ts` 和公开模块承接；新增 owner 只在 `src/internal/**`。
- **Large modules/files (decomposition)**: PASS
  当前预计命中的是 `Reflection.ts`、`kernelContract.ts`、`fullCutoverGate.ts`、`trialRun.ts` 与若干小型 helper，未预期命中 ≥1000 LOC 文件。若实施中扩散到超大文件，先回到 plan 补 decomposition brief。
- **Quality gates**: PASS
  至少运行 targeted vitest、forbidden-edge grep、`pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`。若 canonical `Runtime.trial` backing 被改动，再补 `pnpm typecheck`。

## Perf Evidence Plan（MUST）

- Baseline 语义：默认 `N/A`；若 shared primitive 抽取改变 canonical `Runtime.trial` 的运行/收集路径，则切换到代码前后对比
- envId：当前本机统一开发环境
- profile：default
- collect（before）：仅在触及 canonical `Runtime.trial` 运行语义时执行，并落到 `specs/131-expert-verification-decouple/perf/before.<sha>.<envId>.default.json`
- collect（after）：仅在触及 canonical `Runtime.trial` 运行语义时执行，并落到 `specs/131-expert-verification-decouple/perf/after.<sha>.<envId>.default.json`
- diff：仅在产生 before/after 工件后执行
- Failure Policy：没有 comparable evidence 时，禁止下任何性能结论；只允许下结构收口结论

## Project Structure

### Documentation (this feature)

```text
specs/131-expert-verification-decouple/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── inventory/
│   ├── owner-route-map.md
│   ├── shared-primitive-ledger.md
│   ├── dependency-edge-matrix.md
│   ├── consumer-route-ledger.md
│   └── docs-writeback-matrix.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│   ├── Reflection.ts
│   ├── Runtime.ts
│   ├── Observability.ts
│   └── internal/
│       ├── reflection/
│       ├── observability/
│       ├── runtime/core/
│       ├── verification/        # target neutral owner for shared verification primitives
│       └── protocol/            # target neutral owner for generic serializable protocol contracts
└── test/
    ├── Contracts/
    ├── Runtime/
    ├── observability/
    └── internal/

docs/ssot/runtime/
specs/130-runtime-final-cutover/inventory/
```

**Structure Decision**: 本轮采用“expert-specific logic 留在 `internal/reflection/**`，shared verification primitive 下沉到 `internal/verification/**`，generic protocol contract 下沉到 `internal/protocol/**`，observability 收窄到 observability-owned concern”的结构。`runtime.*` 的 facade 与 consumer 心智保持不动。

### Owner Docs Minimum Set

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- `specs/131-expert-verification-decouple/contracts/README.md`
- `specs/131-expert-verification-decouple/inventory/*.md`

## Complexity Tracking

当前无已批准违例。

若实施中出现以下任一情况，必须先停下补 brief，再继续语义迁移：

- 共享原语迁移扩散到 ≥1000 LOC 文件
- 需要同时重写 `Runtime.trial` facade 与多个 consumer
- 需要在 `observability` 与 `verification` 之间保留双实现一段时间

## Final Gate Checklist

以下各项必须全部满足，才能写 final verdict：

1. `packages/logix-core/src/internal/reflection-api.ts` 与 `packages/logix-core/src/internal/reflection/**` 中不再出现 direct `observability` import
2. `owner-route-map.md`、`shared-primitive-ledger.md`、`dependency-edge-matrix.md`、`consumer-route-ledger.md`、`docs-writeback-matrix.md` 全部闭合，无 `TBD`
3. `runtime.*` canonical route 与 `Reflection.verify*` expert route 的分类仍一致
4. targeted vitest、forbidden-edge grep、`tsc` 全部通过
5. 若触及 canonical `Runtime.trial` 语义，则对应的更宽验证与可比证据已补齐
6. `docs/ssot/runtime/09-verification-control-plane.md` 与 `specs/130-runtime-final-cutover` 相关 ledger 已同步更新

## Phase 0: Research

产物：[`research.md`](./research.md)

目标：

1. 定死 shared primitive 必须转到中性 owner
2. 定死 `JsonValue`、`EvidencePackage`、`trialRun`、artifact contract 的归类策略
3. 定死 canonical route 与 expert route 的最终边界
4. 定死 forbidden edge 的 contract gate 形态
5. 定死 docs / ledgers / tests 的最小回写集合

## Phase 1: Design

产物：

- [`data-model.md`](./data-model.md)
- [`contracts/README.md`](./contracts/README.md)
- [`quickstart.md`](./quickstart.md)
- [`inventory/owner-route-map.md`](./inventory/owner-route-map.md)
- [`inventory/shared-primitive-ledger.md`](./inventory/shared-primitive-ledger.md)
- [`inventory/dependency-edge-matrix.md`](./inventory/dependency-edge-matrix.md)
- [`inventory/consumer-route-ledger.md`](./inventory/consumer-route-ledger.md)
- [`inventory/docs-writeback-matrix.md`](./inventory/docs-writeback-matrix.md)

设计动作：

1. 建 owner、shared primitive、dependency edge、consumer route 的稳定实体
2. 定义 neutral owner 目录与 import 拓扑
3. 定义 expert route 与 canonical route 的 contract
4. 定义 shared primitive 的迁移表与 no-bridge 规则
5. 定义 docs 与 legacy ledger 的同步回写矩阵

## Phase 2: Implementation Planning

在 `tasks.md` 中必须拆成 4 个可独立验收的波次：

1. inventory 与 owner census
2. neutral owner 提取与 `internal/reflection` import 迁移
3. forbidden-edge gate 与 expert route regression
4. canonical route、docs、legacy ledgers 的统一回写

## Verification Plan

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit

rg -n '../observability/|../../observability/|internal/observability/' \
  packages/logix-core/src/internal/reflection-api.ts \
  packages/logix-core/src/internal/reflection \
  -g '*.ts'

# Only if canonical Runtime.trial backing changed:
pnpm typecheck
```
