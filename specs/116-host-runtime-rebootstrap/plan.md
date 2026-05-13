# Implementation Plan: Host Runtime Rebootstrap

**Branch**: `116-host-runtime-rebootstrap` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/116-host-runtime-rebootstrap/spec.md`

## Summary

本计划为宿主相关家族建立统一拓扑：

1. 先固定 `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react` 的角色矩阵
2. 再固定围绕 `kernel + runtime control plane` 的 shared contract
3. 然后为每个包给出目录模板、复用资产和迁移策略

本特性仍是规划阶段，不直接重写 UI 或测试逻辑。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript、React、Vitest、pnpm workspace
**Primary Dependencies**: `packages/logix-react/**`、`packages/logix-sandbox/**`、`packages/logix-test/**`、`packages/logix-devtools-react/**`、`docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`、`docs/ssot/runtime/09-verification-control-plane.md`, `specs/114-*`, `specs/115-*`
**Storage**: 文件系统内的 packages/specs/docs 树
**Testing**: package tree 审计、React / sandbox / devtools / test 目录核对、后续目标测试与 perf plan 落点设计
**Target Platform**: Node.js 20+、现代浏览器、React host runtime
**Project Type**: monorepo host package planning 特性
**Performance Goals**: 宿主包目录重组本身不声明性能提升，但所有触及 render critical path 的后续实现都必须提供 perf evidence
**Constraints**: 围绕同一 control plane；React 无 tearing；devtools/sandbox/test 共享统一证据契约；复用已对齐宿主切片与测试资产
**Scale/Scope**: 4 个宿主相关包，覆盖 provider、hooks、store、worker、compiler、snapshot、UI、test runtime

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性把宿主家族围绕同一 runtime control plane 收口。
- **Docs-first & SSoT**: PASS。依赖 `113` 的 docs 事实源和 `115` 的 kernel 边界。
- **Effect / Logix contracts**: PASS。本特性不直接变更 runtime contract，只规划宿主包职责和边界。
- **IR / anchors**: PASS。要求 devtools、sandbox、test 使用统一证据契约，不新增第二 DSL。
- **Deterministic identity / transaction boundary / React consistency**: PASS。后续实现必须维持稳定 id、txn 边界和无 tearing。
- **Internal contracts & trial runs**: PASS。sandbox/test/devtools 围绕 `runtime.trial` 和统一证据面。
- **Dual kernels**: PASS。由 `115` 提供 kernel support matrix，本特性只消费结果。
- **Performance budget**: PASS。触及 render 关键路径的后续实现必须自行收集证据。
- **Breaking changes**: PASS。宿主包允许目录级重组，不保留旧 façade 兼容层。
- **Public submodules / decomposition**: PASS。family template 会约束公开层与 internal 层。
- **Quality gates**: PASS。以角色矩阵、shared contract、复用资产台账和目录模板为本特性的硬门。

## Perf Evidence Plan（MUST）

当后续实现触及 `packages/logix-react/src/internal/store/**`、`RuntimeProvider.tsx`、`ModuleRuntimeExternalStore.ts` 等 render critical path 时，必须建立 perf evidence。当前 planning 特性本身不执行 collect。

## Project Structure

### Documentation (this feature)

```text
specs/116-host-runtime-rebootstrap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-react/src/
packages/logix-sandbox/src/
packages/logix-test/src/
packages/logix-devtools-react/src/
```

**Structure Decision**: 这是 host family 规划特性。实现落点固定在四个宿主相关包，目标是形成 role matrix、shared contract、directory template 和 reuse ledger。

## Complexity Tracking

无已知违例。

## Phase 0 Research

- 盘点四个宿主相关包的当前角色与目录
- 识别 shared contract 和 reuse candidates
- 提炼目录模板与 archive / rebootstrap 路径

## Phase 1 Design

### Deliverable A: Host Role Matrix

- React host
- Sandbox trial surface
- Test harness
- Devtools observer UI

### Deliverable B: Shared Contract

- runtime control plane 对齐
- 统一证据契约
- React 无 tearing 约束

### Deliverable C: Package Templates And Reuse Ledger

- 每个包的公开层
- internal clusters
- tests / fixtures
- reuse candidates

## Verification Plan

```bash
find packages/logix-react/src packages/logix-sandbox/src packages/logix-test/src packages/logix-devtools-react/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
rg -n 'runtime\\.check|runtime\\.trial|runtime\\.compare|no tearing|useSyncExternalStore|evidence|artifacts' docs/ssot/runtime/*.md docs/standards/*.md
```

## Completion Rule

1. 四个宿主相关包都有清晰角色和目录模板
2. shared control plane contract 成立
3. reuse ledger 已说明哪些切片和测试可直接沿用
4. 后续 `116` 实现可以直接按 tasks 推进
