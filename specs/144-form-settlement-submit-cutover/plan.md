# Implementation Plan: Form Settlement Submit Cutover

**Branch**: `144-form-settlement-submit-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/spec.md)
**Input**: Feature specification from `/specs/144-form-settlement-submit-cutover/spec.md`

## Summary

把 `submitAttempt`、decoded payload、blocking summary、error lifetime 与 submit verdict 收成单线实现，建立在 `142` 和 `143` 已完成的桥接与错误真相源之上。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `@logixjs/form`, `effect`, Vitest
**Testing**: Vitest
**Target Platform**: Node.js 20+
**Constraints**: 零兼容、单轨实施；不保留 dual verdict tree

## Constitution Check

- authority 依赖：
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
- 本波次建立在 `142 + 143` 之上。
- 质量门：
  - focused submit/settlement tests
  - `pnpm typecheck`

## Perf Evidence Plan（MUST）

N/A

## Project Structure

```text
specs/144-form-settlement-submit-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── checklists/requirements.md
└── tasks.md
```

```text
packages/logix-form/src/internal/form/commands.ts
packages/logix-form/src/internal/form/reducer.ts
packages/logix-form/test/**
```

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/form/02-gap-map-and-target-direction.md` | settlement / submit authority |
| `docs/ssot/form/03-kernel-form-host-split.md` | owner split |
| `docs/ssot/form/06-capability-scenario-api-support-map.md` | witness coverage |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| submit gate | `packages/logix-form/src/internal/form/commands.ts` | single `submitAttempt` path |
| verdict state | `packages/logix-form/src/internal/form/reducer.ts` | pure summary / clear trigger alignment |
| tests | `packages/logix-form/test/**` | submit/decoded/blocking/lifetime proofs |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| second blocker leaf | 删除 |
| second verdict tree | 删除 |
| decoded payload state slice | 删除 |
| implicit lifetime branch | 删除 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | 02 / 03 / 06 |
| tests | submit + blocking + decoded payload flows |
| repo gate | `pnpm typecheck` |

## Done Definition

1. `submitAttempt` 成为唯一观察边界
2. decoded payload 只进入 submit output
3. submit summary 只从 base facts 归约
4. stale / cleanup 不阻塞 submit
5. focused tests 和 typecheck 通过

## Complexity Tracking

无已知违宪项。
