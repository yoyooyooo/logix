# Implementation Plan: Core Form Meta Lightweight Derivation

**Branch**: `148-toolkit-form-meta-derivation` | **Date**: 2026-04-18 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md)
**Input**: Feature specification from `/specs/148-toolkit-form-meta-derivation/spec.md`

## Summary

本计划当前不再把这项能力当作 toolkit 实现项。

当前路线固定为：

1. 先把 placement 收到 core-owned adjunct read route
2. 只保留最小派生合同：`isValid / isPristine`
3. 在 exact noun 与 import shape 真正冻结前，不开始实现公开 helper

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4
- **Kill Features (KF)**: KF-3, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, Markdown
**Primary Dependencies**: `packages/logix-react/src/FormProjection.ts`, `examples/logix-react/src/form-support.ts`, `docs/ssot/runtime/10-react-host-projection-boundary.md`, `docs/ssot/runtime/11-toolkit-layer.md`, `docs/ssot/runtime/12-toolkit-candidate-intake.md`, `specs/147-toolkit-layer-ssot/spec.md`
**Testing**: docs/spec alignment review + future core surface checks + example parity spot checks
**Target Platform**: pnpm workspace, core adjunct read surface
**Project Type**: library + docs/spec alignment
**Performance Goals**: 不新增第二读侧 route，不增加 raw meta 读取次数，不把 raw passthrough 重打包成新 object truth
**Constraints**: 只冻结 placement、derived schema 与 de-sugared mapping；不冻结 public noun；不冻结 import shape；不冻结 handle-bound helper / hook family

## Constitution Check

- authority 依赖：
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/ssot/runtime/12-toolkit-candidate-intake.md`
  - `docs/internal/toolkit-candidate-ledger.md`
  - `specs/148-toolkit-form-meta-derivation/spec.md`
- 本波次必须维持：
  - `rawFormMeta()` 是唯一 raw truth
  - 该能力当前属于 `core-gap`
  - `canSubmit` 不进入 exact contract
  - raw passthrough 字段不被重新包装

## Perf Evidence Plan（MUST）

N/A

原因：

- 本波次先处理 contract placement
- 不改 runtime hot path
- 不改 host acquisition law

若后续 reopen 导致读取次数、订阅行为或对象形状变化，再补独立 perf evidence。

## Project Structure

```text
specs/148-toolkit-form-meta-derivation/
├── spec.md
├── plan.md
└── checklists/requirements.md
```

```text
packages/logix-react/src/FormProjection.ts
examples/logix-react/src/form-support.ts
docs/proposals/toolkit-form-meta-derived-view.md
docs/internal/toolkit-candidate-ledger.md
docs/ssot/runtime/10-react-host-projection-boundary.md
```

## Authority Input Table

| Source | Role |
| --- | --- |
| `docs/ssot/runtime/10-react-host-projection-boundary.md` | core read-route boundary |
| `docs/ssot/runtime/11-toolkit-layer.md` | toolkit exclusion gate |
| `docs/ssot/runtime/12-toolkit-candidate-intake.md` | candidate intake authority |
| `docs/internal/toolkit-candidate-ledger.md` | current candidate ledger |
| `docs/proposals/toolkit-form-meta-derived-view.md` | historical narrowing snapshot |

## File Touch Matrix

| Area | Files | Responsibility |
| --- | --- | --- |
| placement authority | `docs/ssot/runtime/10-react-host-projection-boundary.md`, `docs/ssot/runtime/11-toolkit-layer.md`, `docs/ssot/runtime/12-toolkit-candidate-intake.md` | keep core/toolkit boundary aligned |
| candidate tracking | `docs/internal/toolkit-candidate-ledger.md`, `docs/proposals/toolkit-form-meta-derived-view.md`, `specs/148-*` | keep candidate status and future reopen contract aligned |
| future implementation anchor | `packages/logix-react/src/FormProjection.ts` | reserved for future core adjunct read helper reopen |
| sample residue | `examples/logix-react/src/form-support.ts` | verify sample residue still reads as `raw meta -> derivation + app-local usage` |

## Derived Contract

当前只允许冻结：

- `isValid = errorCount === 0`
- `isPristine = !isDirty`

当前明确不冻结：

- `canSubmit`
- `read helper(handle)`
- `hook family`
- selector/equality/cache contract
- raw passthrough repackaging
- exact noun
- import shape

## Done Definition

1. placement 已收口为 `core-gap`
2. `isValid / isPristine` 的等式与 spec 一致
3. `canSubmit` 仍停在 recipe / app-local 层
4. 没有新增第二读侧 route 或第二 object truth
5. docs / ledger / spec 口径一致

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 暂不冻结 exact noun | 当前证据不足以支持稳定命名 | 若现在冻结 noun，会把 API 讨论带回公开面 |
| 暂不冻结 import shape | 还没证明是否值得扩公开面 | 若现在冻结 import，会把 placement 争议变成 surface 争议 |

## Phase 0: Research & Alignment

- 核对 `rawFormMeta()` 当前 contract 与 sample residue 的映射
- 核对旧 review ledger 与最新 live 口径的偏差
- 记录未来 reopen 的 owner 必须停在 core helper 侧

## Phase 1: Boundary Freeze

- 固定 `core-gap` placement
- 固定最小 `DerivedFormMetaSchema`
- 固定唯一 de-sugared mapping
- 固定 forbidden set

## Phase 2: Future Reopen Gate

- 只有在出现新的 live-residue 证据时，才重开 exact noun / import shape
- 若重开，先证明它仍是 `raw meta -> derivation` 的机械展开
- 若重开失败，继续维持当前“只冻边界，不开公开 helper”的状态
