# Implementation Plan: Form Canonical Error Carrier Cutover

**Branch**: `143-form-canonical-error-carrier-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/spec.md)
**Input**: Feature specification from `/specs/143-form-canonical-error-carrier-cutover/spec.md`

## Summary

把 `FormErrorLeaf` 真正落成单一 canonical error carrier，同时清掉 string/raw leaf、`errors.$schema` 和 error count 的旧 residue，为 settlement 与 locality 后续 cutover 提供稳定错误真相源。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `@logixjs/form`, Vitest
**Storage**: N/A
**Testing**: Vitest
**Target Platform**: Node.js 20+
**Project Type**: pnpm workspace / packages
**Performance Goals**: 消掉第二错误树与 string/raw leaf 判断分支，降低解释面复杂度
**Constraints**: 零兼容、单轨实施；不保留 dual-write
**Scale/Scope**: `packages/logix-form` error tree、reducer、counting、commands 与 tests

## Constitution Check

- authority 依赖：
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - `docs/proposals/form-validation-funnel-export-contract.md`
- 本波次建立在 `142` 的桥接单线化之上。
- 不改 control plane shell。
- 不保留 string/raw leaf 兼容分支。
- 质量门：
  - focused form tests
  - `pnpm typecheck`

## Perf Evidence Plan（MUST）

N/A

## Project Structure

```text
specs/143-form-canonical-error-carrier-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── checklists/requirements.md
└── tasks.md
```

```text
packages/logix-form/src/internal/form/errors.ts
packages/logix-form/src/internal/form/reducer.ts
packages/logix-form/src/internal/form/commands.ts
packages/logix-form/src/internal/schema/SchemaErrorMapping.ts
packages/logix-form/test/**
```

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/form/02-gap-map-and-target-direction.md` | canonical error carrier authority |
| `docs/ssot/form/03-kernel-form-host-split.md` | owner split |
| `docs/ssot/form/06-capability-scenario-api-support-map.md` | witness coverage |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| error count | `packages/logix-form/src/internal/form/errors.ts` | 只承认 canonical leaf |
| error write path | `packages/logix-form/src/internal/form/reducer.ts` | 删除旧 leaf writeback |
| command edge | `packages/logix-form/src/internal/form/commands.ts` | 对齐 canonical carrier |
| decode lowering residue | `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts` | 清掉 raw writeback |
| tests | `packages/logix-form/test/**` | 锁住 single carrier |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| string leaf | 删除 |
| raw object leaf | 删除 |
| `errors.$schema` canonical role | 降为 residue |
| old count logic | 删除 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | 02 / 03 / 06 |
| unit/contract | form error tree and reducer tests |
| repo gate | `pnpm typecheck` |

## Done Definition

1. `FormErrorLeaf` 成为唯一 canonical carrier
2. string/raw leaf 退出 canonical truth
3. `errors.$schema` 不再承担 canonical role
4. error count 只按 canonical leaf 计算
5. focused tests 和 typecheck 通过

## Complexity Tracking

无已知违宪项。
