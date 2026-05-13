# Implementation Plan: Runtime Control Plane Report Shell Cutover

**Branch**: `141-runtime-control-plane-report-shell-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/spec.md)
**Input**: Feature specification from `/specs/141-runtime-control-plane-report-shell-cutover/spec.md`

**Note**: This plan targets the first concrete cutover wave under `140-form-cutover-roadmap`.

## Summary

把 `runtime/09` 已冻结的 report shell contract 真实落到 core contract、CLI emit path 和 contract tests。此波次只做 control plane exact shell，对 Form truth 本身不做语义改写，但要让后续 `142-146` 能稳定消费同一 report shell。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `effect@4 beta`, `@logixjs/core`, `@logixjs/cli`, Vitest
**Storage**: N/A
**Testing**: Vitest, integration CLI output contract tests
**Target Platform**: Node.js 20+
**Project Type**: pnpm workspace / packages + specs
**Performance Goals**: 本波次不改变 runtime 执行热路径算法；重点保证 report shell 单轨，不引入第二对象与额外 materializer taxonomy
**Constraints**: 零兼容、单轨实施；不保留旧 report shell 与旧 repair hint shape 双轨输出；living `runtime/09` 是唯一 exact authority
**Scale/Scope**: 1 个 core contract 文件 + 4 个 CLI emit/result 文件 + 5 个 contract/integration tests + 1 个 SSoT 页面

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- NS/KF 已在 spec 中记录，并映射到 report shell 单轨收口目标。
- 当前工作直接映射到：
  - `Intent`: Agent 需要稳定的 report shell 与 repair target
  - `Flow/Logix`: runtime control plane 作为统一验证出口
  - `Code`: core `ControlPlane.ts`、CLI emit path、tests
  - `Runtime`: `check / trial / compare` 共用同一 report shell
- 依赖并修改的事实源：
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - consumed freeze notes 只作为背景输入，不再承载 exact contract
- 本波次会修改 control plane contract，因此 `runtime/09` 是唯一 contract owner。
- 不改变 unified minimal IR 或 Platform-Grade 子集；只改变 report shell 与 repair linking exact shape。
- 不引入新的随机或时间型 identity；`focusRef` 只搬运已有稳定坐标。
- 不在 transaction window 内引入 IO；本波次是 shell contract 与 CLI output cutover。
- 不触碰 React external-store 边界。
- 不新增 internal hook；只压实已有 report shell 合同。
- 不触碰 dual kernel 支持矩阵的语义；但 contract tests 需保证 core route 稳定。
- 性能预算：不引入第二 report object、第二 artifact taxonomy、第二 naming axis。
- 诊断与 explainability：`repairHints.focusRef` 与 linking law 必须更可解释，同时 compare 主轴不吸收 materializer。
- 用户面性能心智模型不扩张；仅修正 control plane 的对象形状与 naming。
- breaking change：有。允许直接 cutover，不保留兼容层；迁移说明写入 implementation plan 与后续 PR。
- Single-track implementation：通过。此 plan 明确禁止 dual-write、shadow path、兼容模式。
- 不触碰 `packages/*` public submodule 结构。
- 相关文件都不超大；无需额外 decomposition brief。
- 质量门：
  - `pnpm typecheck`
  - 相关 core/cli tests
  - CLI integration output contract tests

## Perf Evidence Plan（MUST）

N/A

原因：

- 本波次不改 runtime 执行算法
- 不改 selector / scheduler / transaction / reconciliation 热路径
- 主要风险是 contract drift，不是 perf regression

## Project Structure

### Documentation (this feature)

```text
specs/141-runtime-control-plane-report-shell-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
docs/ssot/runtime/09-verification-control-plane.md

packages/logix-core/src/ControlPlane.ts
packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts

packages/logix-cli/src/internal/result.ts
packages/logix-cli/src/internal/commands/check.ts
packages/logix-cli/src/internal/commands/trial.ts
packages/logix-cli/src/internal/commands/compare.ts

packages/logix-cli/test/Integration/output-contract.test.ts
packages/logix-cli/test/Integration/check.command.test.ts
packages/logix-cli/test/Integration/trial.command.test.ts
packages/logix-cli/test/Integration/compare.command.test.ts
```

**Structure Decision**: 本波次只切 control plane report shell，因此 source code 只动 core contract、CLI emit path 和 tests。Form 相关 living SSoT 不在本波次改动。

## Research Summary

详见 [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/research.md)。

本波次的主要裁决：

- `VerificationControlPlaneReport` 是唯一 canonical report shell
- `kind` 压成单一常量 `VerificationControlPlaneReport`
- `stage + mode` 是唯一变体轴
- `repairHints` 的 machine core 收成 `code / canAutoRetry / upgradeToStage / focusRef`
- `focusRef` 是 coordinate-first repair target
- artifact linking 通过 `relatedArtifactOutputKeys`
- `artifact.role` 删除
- `TrialReport` 是 pure alias

## Data Model & Contracts

- data model: [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/data-model.md)
- contract surface: [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/contracts/README.md)

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| SSoT authority | `docs/ssot/runtime/09-verification-control-plane.md` | 作为唯一 exact shell authority，锁死 naming / focus / linking law |
| Core contract | `packages/logix-core/src/ControlPlane.ts` | 收口 shell type、guard、builder |
| CLI adapter | `packages/logix-cli/src/internal/result.ts` | 收口 artifact refs 与 report builder adapter |
| CLI emit path | `packages/logix-cli/src/internal/commands/check.ts` | 输出新 shell |
| CLI emit path | `packages/logix-cli/src/internal/commands/trial.ts` | 输出新 shell |
| CLI emit path | `packages/logix-cli/src/internal/commands/compare.ts` | 输出新 shell |
| Core contract tests | `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` | 验证 shell guard 与 alias law |
| CLI integration tests | `packages/logix-cli/test/Integration/output-contract.test.ts` | 验证 shared shell |
| CLI integration tests | `packages/logix-cli/test/Integration/check.command.test.ts` | 验证 check report |
| CLI integration tests | `packages/logix-cli/test/Integration/trial.command.test.ts` | 验证 trial report |
| CLI integration tests | `packages/logix-cli/test/Integration/compare.command.test.ts` | 验证 compare report |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| stage-specific report shape | 删除，回到单一 `VerificationControlPlaneReport` |
| `TrialReport` second shape possibility | 删除，固定为 pure alias |
| `artifact.role` | 删除 |
| repair prose truth 作为 machine core | 降为消费层可选字段 |
| proposal-owned exact carrier | 删除，living `runtime/09` 单点持有 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | `runtime/09` 写死 exact shell |
| Core contract | `VerificationControlPlaneContract.test.ts` |
| CLI shared shell | `output-contract.test.ts` |
| stage-specific output | `check.command.test.ts`, `trial.command.test.ts`, `compare.command.test.ts` |
| whole-repo quality gate | `pnpm typecheck` |

## Done Definition

本波次只有同时满足下面条件才算完成：

1. `runtime/09` 成为唯一 exact shell authority
2. core `ControlPlane.ts` 与 guard/builder 落到新 shell
3. CLI `check / trial / compare` 都输出同一 report shell
4. `artifact.role` 从 contract 中退出
5. `TrialReport` 不再持有第二 shape
6. 相关 contract/integration tests 全部按新 shell 对齐
7. 没有 dual-write、shadow path、兼容模式或旧 shell 并存

## Complexity Tracking

无已知违宪项。
