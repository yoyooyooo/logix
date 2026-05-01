# Implementation Plan: Form Active Shape Locality Cutover

**Branch**: `145-form-active-shape-locality-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/spec.md)
**Input**: Feature specification from `/specs/145-form-active-shape-locality-cutover/spec.md`

## Summary

把 active-shape lane 的 row ownership、cleanup、remap 与 locality receipts 真正收成单一主线，让 `reasonSlotId.subjectRef` 成为唯一 locality 坐标。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `@logixjs/form`, Vitest
**Testing**: Vitest
**Target Platform**: Node.js 20+
**Constraints**: 零兼容、单轨实施；不保留 index-first locality

## Constitution Check

- authority 依赖：
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
- 本波次建立在 `143` 的 canonical error carrier 之上。
- 质量门：
  - focused active-shape tests
  - `pnpm typecheck`

## Perf Evidence Plan（MUST）

N/A

## Project Structure

```text
specs/145-form-active-shape-locality-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── checklists/requirements.md
└── tasks.md
```

```text
packages/logix-form/src/internal/form/arrays.ts
packages/logix-form/src/internal/form/reducer.ts
packages/logix-form/test/**
```

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/form/02-gap-map-and-target-direction.md` | active-shape / locality authority |
| `docs/ssot/form/03-kernel-form-host-split.md` | owner split |
| `docs/ssot/form/06-capability-scenario-api-support-map.md` | witness coverage |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| row editing and remap | `packages/logix-form/src/internal/form/arrays.ts` | row ownership / remap path |
| state cleanup | `packages/logix-form/src/internal/form/reducer.ts` | active exit cleanup behavior |
| tests | `packages/logix-form/test/**` | continuity / cleanup / remap proofs |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| index-first locality | 删除 |
| side refs | 删除 |
| cleanup residual pending/blocking | 删除 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | 02 / 03 / 06 |
| tests | active-shape / arrays / continuity tests |
| repo gate | `pnpm typecheck` |

## Done Definition

1. row continuity 只依赖 stable locality
2. cleanup / remap / ownership 只用同一 locality 语言
3. active exit 后只留下 cleanup reason
4. focused tests 和 typecheck 通过

## Complexity Tracking

无已知违宪项。
