# Implementation Plan: Form Validation Bridge Cutover

**Branch**: `142-form-validation-bridge-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/spec.md)
**Input**: Feature specification from `/specs/142-form-validation-bridge-cutover/spec.md`

## Summary

把 submit-only decode gate、decode-origin canonical bridge、normalized decode facts、path-first lowering 与 submit fallback 从当前 SSoT 收口成实际实现路径，为 `143` 和 `144` 提供单一 bridge 基线。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `effect@4 beta`, `@logixjs/form`, `@logixjs/core`, Vitest
**Storage**: N/A
**Testing**: Vitest
**Target Platform**: Node.js 20+
**Project Type**: pnpm workspace / packages
**Performance Goals**: 不改变核心 runtime 算法；重点消除多桥接路径与 raw writeback
**Constraints**: 零兼容、单轨实施；不保留 pre-submit structural decode route
**Scale/Scope**: `packages/logix-form` 内部 schema bridge、commands、tests、相关 living SSoT

## Constitution Check

- 本波次直接映射 `Intent → Flow/Logix → Code → Runtime` 中的 validation bridge 收口。
- authority 依赖：
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/proposals/form-validation-funnel-export-contract.md`
  - `docs/proposals/runtime-control-plane-materializer-report-contract.md`
- 本波次不改 runtime control plane exact shell。
- 本波次不引入 dual-write、shadow path 或兼容 route。
- 质量门：
  - focused form tests
  - `pnpm typecheck`

## Perf Evidence Plan（MUST）

N/A

## Project Structure

### Documentation (this feature)

```text
specs/142-form-validation-bridge-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
docs/ssot/form/02-gap-map-and-target-direction.md
docs/ssot/form/03-kernel-form-host-split.md
docs/ssot/form/06-capability-scenario-api-support-map.md

packages/logix-form/src/internal/schema/SchemaPathMapping.ts
packages/logix-form/src/internal/schema/SchemaErrorMapping.ts
packages/logix-form/src/internal/form/commands.ts
packages/logix-form/src/SchemaPathMapping.ts
packages/logix-form/src/SchemaErrorMapping.ts

packages/logix-form/test/SchemaPathMapping.test.ts
packages/logix-form/test/SchemaErrorMapping.test.ts
```

**Structure Decision**: 这波只动 `packages/logix-form` 的 schema bridge 主线与相关 tests。error carrier residue、submit verdict、active-shape receipts 都留给后续 member。

## Research Summary

详见 [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/research.md)。

关键决策：

- gate 固定为 submit-only
- bridge 只认 normalized decode facts
- lowering 固定为 path-first + submit fallback
- raw schema issue 退出 canonical truth

## Data Model & Contracts

- [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/data-model.md)
- [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/contracts/README.md)

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/form/02-gap-map-and-target-direction.md` | validation bridge primary authority |
| `docs/ssot/form/03-kernel-form-host-split.md` | owner split |
| `docs/ssot/form/06-capability-scenario-api-support-map.md` | witness coverage |
| `docs/proposals/form-validation-funnel-export-contract.md` | consumed delta / residue context |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| bridge input normalization | `packages/logix-form/src/internal/schema/SchemaPathMapping.ts` | 收口 normalized decode facts 输入 |
| bridge lowering | `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts` | path-first lowering + submit fallback |
| trigger point | `packages/logix-form/src/internal/form/commands.ts` | submit-only decode gate |
| public helper shell | `packages/logix-form/src/SchemaPathMapping.ts`, `packages/logix-form/src/SchemaErrorMapping.ts` | 保持 capability-level 对齐，不回流 planning noun |
| tests | `packages/logix-form/test/SchemaPathMapping.test.ts`, `packages/logix-form/test/SchemaErrorMapping.test.ts` | 锁住 bridge law |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| `SchemaError = unknown` | 删除，改成 normalized decode facts 输入 |
| path guessing over `.errors / .issues / path` | 删除，改成 canonical normalization |
| raw schema writeback in bridge | 删除，退出 canonical truth |
| pre-submit structural decode route | 删除 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | 02 / 03 / 06 继续作为 authority |
| unit/contract | `SchemaPathMapping.test.ts`, `SchemaErrorMapping.test.ts` |
| integration | submit-only decode path through commands |
| repo gate | `pnpm typecheck` |

## Done Definition

1. structural decode gate 只在 submit lane 激活
2. field-level validate 不再触发 structural decode
3. bridge 只消费 normalized decode facts
4. lowering 固定为 path-first + submit fallback
5. raw schema issue 退出 canonical truth
6. focused tests 与 typecheck 通过

## Complexity Tracking

无已知违宪项。
