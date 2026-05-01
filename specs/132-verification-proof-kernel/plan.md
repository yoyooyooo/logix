# Implementation Plan: Verification Proof Kernel Second Wave

**Branch**: `132-verification-proof-kernel` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/132-verification-proof-kernel/spec.md`

## Summary

本计划把 proof-kernel 第二波收口成三条必须同时完成的主线：

1. 把 `proofKernel` 固定为唯一共享执行内核
2. 把 `trialRunModule.ts` 压成真正的 canonical adapter，并按单一职责拆分 report / environment / artifact / error mapping
3. 用 route contract、docs 回写和结构门禁防止 canonical adapter 再次膨胀成第二个 verification 子系统

### Current-State Snapshot

- `packages/logix-core/src/internal/verification/proofKernel.ts` 已存在，并承接 shared execution wiring
- `packages/logix-core/src/internal/verification/trialRun.ts` 已退成薄 wrapper
- `packages/logix-core/src/internal/reflection/{kernelContract.ts,fullCutoverGate.ts}` 已改吃 `proofKernel`
- [trialRunModule.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts) 当前约 500 LOC，仍同时承接：
  - buildEnv / missing dependency 解释
  - kernel boot / close 协调
  - environment 归纳
  - manifest / staticIr / artifacts / evidence re-export
  - budget 恢复与最终 report 组装

当前结构已经正确，剩余问题是 canonical adapter 还不够小，也不够容易被 Agent 预测落点。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Effect v4, Markdown
**Primary Dependencies**: `packages/logix-core/src/internal/{verification,observability,reflection,runtime/core,artifacts,protocol}/**`, `packages/logix-core/src/{Runtime.ts,Reflection.ts}`, `packages/logix-core/test/{Contracts,Runtime,observability}/**`, `docs/ssot/runtime/09-verification-control-plane.md`, `specs/130-runtime-final-cutover/inventory/**`, `specs/131-expert-verification-decouple/**`
**Storage**: files / N/A
**Testing**: Vitest, route grep gate, `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`, `pnpm typecheck` when canonical route behavior changes
**Target Platform**: Node.js 20+ + modern browsers
**Project Type**: pnpm workspace monorepo
**Performance Goals**: 不宣称新性能收益；若拆分 `trialRunModule.ts` 改变 canonical `Runtime.trial` steady-state 行为路径，必须提供 targeted before/after 验证
**Constraints**: forward-only；公开 API 不变；`proofKernel` 继续是唯一共享执行内核；`trialRunModule.ts` 不得继续持有 `session + collector + shared layer wiring + exit normalization`；拆分必须单向依赖且单一职责
**Scale/Scope**: `packages/logix-core/src/internal/observability/trialRunModule.ts` 及其直接相邻模块为主，同步触达 `verification`、`reflection`、contracts tests、SSoT 与 legacy ledgers

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: PASS
  `spec.md` 与 `plan.md` 保持 NS-8 / NS-10、KF-8 / KF-9 一致。
- **Intent → Flow/Logix → Code → Runtime 链路**: PASS
  本轮不改业务建模，收口的是 `Runtime.trial -> trialRunModule -> proofKernel` 与 `Reflection.verify* -> proofKernel` 的内部结构。
- **Docs-first & SSoT**: PASS WITH WRITEBACK
  `docs/ssot/runtime/09-verification-control-plane.md` 以及 `specs/130`、`specs/131` ledger 必须同步回写 proof-kernel 第二波口径。
- **Effect / Logix contracts**: PASS WITH GATE
  公开 contract 不变；允许内部 adapter 拆分与 route contract 加强。
- **IR & anchors**: PASS
  本轮不改 minimal IR，也不改 `instanceId / txnSeq / opSeq` 语义。
- **Deterministic identity**: PASS
  `proofKernel` 输出与 canonical adapter 拆分不得改变 `runId`、instance identity、error summary 稳定性。
- **Transaction boundary**: PASS
  不引入新的 txn 内 IO/async，也不改变 state transaction 边界。
- **Internal contracts & trial runs**: PASS WITH GATE
  `proofKernel` 是唯一共享执行内核；canonical / expert adapter 只能消费，不得复制其 shared execution 逻辑。
- **Dual kernels (core + core-ng)**: PASS
  不新增 kernel surface；保持现有 contract tests 和 support matrix 约束。
- **Performance budget**: PASS WITH ESCALATION
  默认不给性能结论；若 `trialRunModule.ts` 拆分触及 canonical behavior path，再补 targeted before/after 验证。
- **Diagnosability & explainability**: PASS
  拆分后 `report / environment / error summary / artifact budget` 解释链必须保持清晰。
- **User-facing performance mental model**: PASS
  对外命名不变，只需同步 internal owner / adapter 说明。
- **Breaking changes (forward-only evolution)**: PASS
  允许 internal path breaking，不保留兼容层。
- **Public submodules**: PASS
  只在 `src/internal/**` 继续收口；公开 barrel 不需要新增路径。
- **Large modules/files (decomposition)**: PASS WITH ACTION
  `trialRunModule.ts` 已经超过 500 LOC，是本轮明确拆解对象。虽然未达 1000 LOC 强制阈值，仍按“互斥子模块”原则先定边界，再做语义迁移。
- **Quality gates**: PASS
  至少运行 targeted contract suite、canonical route suite、`tsc`、必要时 `pnpm typecheck`。

## Perf Evidence Plan（MUST）

- Baseline 语义：默认 `N/A`
- 升级条件：只有当 `trialRunModule.ts` 的拆分改变 canonical `Runtime.trial` steady-state 行为路径，才需要 before/after 证据
- envId：当前本机统一开发环境
- profile：default
- Failure Policy：没有 comparable evidence 时，禁止下性能结论；只允许下结构压缩结论

## Project Structure

### Documentation (this feature)

```text
specs/132-verification-proof-kernel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── inventory/
│   ├── route-layer-map.md
│   ├── canonical-adapter-split.md
│   └── docs-writeback-matrix.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Runtime.ts
├── Reflection.ts
└── internal/
    ├── verification/
    │   ├── proofKernel.ts
    │   ├── proofKernel.types.ts
    │   └── trialRun.ts
    ├── observability/
    │   ├── trialRunModule.ts
    │   ├── trialRunReportPipeline.ts
    │   └── artifacts/
    ├── reflection/
    │   ├── kernelContract.ts
    │   └── fullCutoverGate.ts
    └── runtime/core/

packages/logix-core/test/
├── Contracts/
├── Runtime/
└── observability/
```

**Structure Decision**: proof-kernel 继续停在 `internal/verification/**`；canonical `trialRunModule.ts` 若继续拆分，拆出来的新文件仍放在 `internal/observability/` 邻近目录，但只允许承接 canonical adapter 自己的职责。禁止把 shared execution 再放回 `observability`。

## Complexity Tracking

当前无已批准违例。

如果拆分中出现以下情况，必须停下补 brief 再继续：

- `trialRunModule.ts` 拆分后仍出现双向依赖
- report / environment / artifact / error mapping 中有两个文件重复计算同一事实
- adapter 子模块需要重新引入 session 或 collector 构造

## Phase 0: Research

产物：[`research.md`](./research.md)

目标：

1. 定死 canonical adapter 与 proof-kernel 的最终职责边界
2. 定死 `trialRunModule.ts` 应拆成哪些互斥子模块
3. 定死 route contract tests 的最终门禁形状
4. 定死 docs / ledger 的同步回写集合

## Phase 1: Design

产物：

- [`data-model.md`](./data-model.md)
- [`contracts/README.md`](./contracts/README.md)
- [`quickstart.md`](./quickstart.md)
- [`inventory/route-layer-map.md`](./inventory/route-layer-map.md)
- [`inventory/canonical-adapter-split.md`](./inventory/canonical-adapter-split.md)
- [`inventory/docs-writeback-matrix.md`](./inventory/docs-writeback-matrix.md)

设计动作：

1. 建 proof-kernel / canonical adapter / expert adapter 的稳定实体
2. 固定 canonical adapter 拆分的候选文件边界
3. 固定 route contract、grep gate 与 direct consumer 解释
4. 固定 docs 与 legacy ledgers 的 writeback 矩阵

## Phase 2: Implementation Planning

在 `tasks.md` 中必须拆成 4 个可独立验收的波次：

1. inventory 与 route-layer census
2. `trialRunModule.ts` 拆分与 canonical adapter 压缩
3. route contracts 与 canonical behavior regression
4. docs / ledgers / final gate 收口

## Verification Plan

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts

pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
  packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit

# Only if canonical behavior path changed:
pnpm typecheck
```
