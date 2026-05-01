# Implementation Plan: Form Host Examples Dogfooding Cutover

**Branch**: `146-form-host-examples-dogfooding-cutover` | **Date**: 2026-04-16 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/146-form-host-examples-dogfooding-cutover/spec.md)
**Input**: Feature specification from `/specs/146-form-host-examples-dogfooding-cutover/spec.md`

## Summary

在 `141-145` 底层 contract 稳定后，把 React host、examples、docs、dogfooding 和 root surface 统一切到新 truth，清掉旧示例和旧 package-facing residue。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Markdown/MDX
**Primary Dependencies**: `@logixjs/form`, `@logixjs/react`, examples, docs
**Testing**: examples smoke validation + docs/example spot checks + typecheck
**Target Platform**: Node.js 20+, modern browsers
**Constraints**: 零兼容、单轨实施；不保留旧示例并存

## Constitution Check

- authority 依赖：
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
- 本波次建立在 `141-145` 已完成之上。
- 质量门：
  - example smoke validation
  - `pnpm typecheck`

## Perf Evidence Plan（MUST）

N/A

## Project Structure

```text
specs/146-form-host-examples-dogfooding-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── checklists/requirements.md
└── tasks.md
```

```text
packages/logix-form/src/index.ts
packages/logix-form/src/react/**
examples/logix/**
examples/logix-react/**
apps/docs/content/docs/form/**
```

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | package-facing exact surface authority |
| `docs/ssot/runtime/10-react-host-projection-boundary.md` | host consumption authority |
| `docs/ssot/form/02-gap-map-and-target-direction.md` | form semantics authority |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| package root | `packages/logix-form/src/index.ts` | root surface cleanup |
| host path | `packages/logix-form/src/react/**` | host consumption alignment |
| examples | `examples/logix/**`, `examples/logix-react/**` | dogfooding alignment |
| docs | `apps/docs/content/docs/form/**` | docs narrative alignment |

## Residue Tombstone

| Residue | Final Fate |
| --- | --- |
| old example paths | 删除 |
| old docs narrative | 删除 |
| old root export residue | 删除 |

## Verification Matrix

| Layer | Proof |
| --- | --- |
| SSoT | exact surface + host boundary |
| examples/docs | smoke validation + spot checks |
| repo gate | `pnpm typecheck` |

## Done Definition

1. examples/docs 只剩新 contract
2. root surface 与 living SSoT 一致
3. old examples 和 old root export residue 退出主线
4. example/doc checks 与 typecheck 通过

## Complexity Tracking

无已知违宪项。
