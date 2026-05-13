# Implementation Plan: Core Kernel Extraction

**Branch**: `115-core-kernel-extraction` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/115-core-kernel-extraction/spec.md`

## Summary

本计划用三步完成 kernel 规划：

1. 先画出 `kernel / runtime shell / observability / reflection / process` 的目标边界图
2. 再建立 `core / core-ng` support matrix 和 reuse ledger
3. 最后把公开面、迁移路径和 perf evidence 门写清

这份 planning 特性不直接搬完代码，但会为后续实现提供唯一边界和迁移口径。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript、Effect v4 基线、pnpm workspace
**Primary Dependencies**: `packages/logix-core/**`, `packages/logix-core-ng/**`, `docs/ssot/runtime/01-public-api-spine.md`, `docs/ssot/runtime/02-hot-path-direction.md`, `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`, `docs/standards/logix-api-next-guardrails.md`, `specs/114-*`
**Storage**: 文件系统内的 packages/specs/docs 树
**Testing**: core/core-ng 目录审计、support matrix、边界测试与 perf evidence 计划
**Target Platform**: Node.js 20+、现代浏览器、`@logixjs/core` 主线
**Project Type**: runtime core planning 特性
**Performance Goals**: 规划特性本身不直接提升性能，但后续实现必须保护热路径和诊断开销
**Constraints**: kernel 必须更小、更一致；`core-ng` 不再并列主线；复用已对齐热链路和测试；无兼容层
**Scale/Scope**: `packages/logix-core/src/**`、`packages/logix-core-ng/src/**`、相关 tests 与 supporting docs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性负责重画 runtime 主线的核心执行边界。
- **Docs-first & SSoT**: PASS。依赖 `113` 的 docs 事实源和 `114` 的 package policy。
- **Effect / Logix contracts**: PASS。会明确 kernel contract 与公开 surface map，但规划阶段不直接实现。
- **IR / anchors**: PASS。kernel 化要求 observability / reflection 继续从同一运行事实抽取证据。
- **Deterministic identity / txn boundary**: PASS。后续实现必须维持稳定 `instanceId / txnSeq / opSeq` 和无 IO 事务边界。
- **React consistency / external sources**: N/A。由后续 host spec 处理。
- **Internal contracts & trial runs**: PASS。support matrix 会约束 runtime services 的去向。
- **Dual kernels**: PASS。`core-ng` 仅作为 support matrix 输入。
- **Performance budget**: PASS。必须建立 perf baseline 与 diff 路径。
- **Diagnosability & explainability**: PASS。diagnostics 相关模块默认优先复用。
- **Breaking changes**: PASS。允许收缩公开面，不保留兼容层。
- **Public submodules / decomposition**: PASS。后续实现必须遵守 `src/*.ts` 公开子模块与 `src/internal/**` 规则。
- **Quality gates**: PASS。边界图、support matrix、reuse ledger 和 perf evidence plan 是硬门。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后
- envId：本机 `darwin-arm64` + Node.js 版本 + 浏览器矩阵
- profile：default，必要时补 soak
- collect（before）：`pnpm perf collect -- --profile default --out specs/115-core-kernel-extraction/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/115-core-kernel-extraction/perf/after.<sha|worktree>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/115-core-kernel-extraction/perf/before...json --after specs/115-core-kernel-extraction/perf/after...json --out specs/115-core-kernel-extraction/perf/diff.before__after.json`
- Failure Policy：`comparable=false` 时禁止对 kernel 化收益下结论

## Project Structure

### Documentation (this feature)

```text
specs/115-core-kernel-extraction/
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
packages/logix-core/src/
├── Kernel.ts
├── Runtime.ts
├── Observability.ts
├── Reflection.ts
├── Process.ts
└── internal/
    ├── runtime/core/
    ├── observability/
    ├── reflection/
    └── runtime/core/process/

packages/logix-core-ng/src/
```

**Structure Decision**: kernel 主落点继续围绕 `packages/logix-core/src/internal/runtime/core/`，再通过公开入口与 supporting clusters 组织 shell / observability / reflection / process。`core-ng` 不再作为并列主线。

## Complexity Tracking

无已知违例。

## Phase 0 Research

- 盘点 zone map
- 盘点 support matrix
- 盘点 reuse candidates
- 确定公开面收缩路径

## Phase 1 Design

### Deliverable A: Zone Map

- kernel
- runtime shell
- observability
- reflection
- process

### Deliverable B: Support Matrix

- `core` 为长期主线
- `core-ng` 为迁移输入
- runtime services 和 contract 归属清晰

### Deliverable C: Reuse Ledger

- 热链路实现
- 诊断模块
- 覆盖测试
- helper

## Verification Plan

```bash
find packages/logix-core/src packages/logix-core-ng/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## Completion Rule

1. zone map 稳定
2. support matrix 稳定
3. reuse ledger 稳定
4. perf evidence plan 稳定
5. 后续 `115` 实现可直接按 tasks 推进
