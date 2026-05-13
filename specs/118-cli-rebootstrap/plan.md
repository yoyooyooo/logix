# Implementation Plan: CLI Rebootstrap

**Branch**: `118-cli-rebootstrap` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/118-cli-rebootstrap/spec.md`

## Summary

本计划把 CLI 收口为新的 control plane 工具层：

1. 先固定新 CLI 的一级命令面和输出契约
2. 再固定旧 CLI 的 archive / expert 路由
3. 最后把可复用 helper、artifact 处理和测试资产登记清楚

规划阶段只给出命令面、模板和迁移策略，不直接完成完整命令实现。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript、Node.js CLI、pnpm workspace
**Primary Dependencies**: `packages/logix-cli/**`, `docs/ssot/runtime/09-verification-control-plane.md`, `specs/114-*`, `specs/115-*`
**Storage**: 文件系统内的 packages/specs/docs 树
**Testing**: CLI integration tests、命令面快照、输出契约核对
**Target Platform**: Node.js 20+ 命令行环境
**Project Type**: CLI planning 特性
**Performance Goals**: N/A，新 CLI 规划本身不声明性能收益
**Constraints**: 主命令面必须收紧到 `check / trial / compare`；复用已对齐 helper 与测试资产；不保留双套主命令面
**Scale/Scope**: `packages/logix-cli/src/**`、相关 tests、verification docs 对齐

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性把验证控制面落到可用的 CLI 命令面。
- **Docs-first & SSoT**: PASS。命令面必须与 `09-verification-control-plane.md` 保持一致。
- **Effect / Logix contracts**: PASS。规划阶段不新增业务建模 contract，只定义 CLI surface。
- **IR / anchors / identity / txn boundary**: PASS。CLI 只消费这些 contract，不重定义。
- **Internal contracts & trial runs**: PASS。CLI 围绕 `runtime.check / runtime.trial / runtime.compare` 组织。
- **Dual kernels**: PASS。CLI 只消费 `115` 的结果，不单独裁决。
- **Performance budget**: N/A。CLI 规划本身不触及热路径。
- **Breaking changes**: PASS。旧命令允许退出主线，无兼容层。
- **Quality gates**: PASS。命令面、输出契约、archive 路由和 reuse ledger 是硬门。

## Perf Evidence Plan（MUST）

N/A。若未来 CLI 实现引入显著 artifact 或 trace 处理成本，再单独建证据。

## Project Structure

### Documentation (this feature)

```text
specs/118-cli-rebootstrap/
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
packages/logix-cli/src/
├── bin/
├── Commands.ts
├── index.ts
└── internal/
    ├── commands/
    ├── artifacts.ts
    ├── output.ts
    ├── result.ts
    └── stableJson.ts
```

**Structure Decision**: 保留 `@logixjs/cli` 包名，重组其内部命令层与 archive 路由。新主线围绕 `check / trial / compare`。

## Complexity Tracking

无已知违例。

## Phase 0 Research

- 盘点现有命令
- 提炼新命令面
- 识别可复用 helper 与测试
- 设计 legacy 路由

## Phase 1 Design

### Deliverable A: Command Surface

- `check`
- `trial`
- `compare`

### Deliverable B: Output Contract

- verdict
- summary
- artifacts
- repairHints
- nextRecommendedStage

### Deliverable C: Legacy Routing And Reuse Ledger

- 旧命令去向
- helper / artifact 处理复用
- tests 复用

## Verification Plan

```bash
find packages/logix-cli/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
rg -n 'runtime\\.check|runtime\\.trial|runtime\\.compare|repairHints|nextRecommendedStage' docs/ssot/runtime/09-verification-control-plane.md specs/118-cli-rebootstrap/*
```

## Completion Rule

1. 新命令面稳定
2. 输出契约稳定
3. legacy 路由稳定
4. reuse ledger 稳定
5. 后续实现可直接按 tasks 推进
