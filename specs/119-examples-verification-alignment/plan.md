# Implementation Plan: Examples Verification Alignment

**Branch**: `119-examples-verification-alignment` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/119-examples-verification-alignment/spec.md`

## Summary

本计划把 `examples/logix` 收口成 dogfooding 与 verification 的双入口：

1. 先建立 examples inventory、docs anchor map 和 reuse ledger
2. 再定义 `features / patterns / runtime / scenarios / verification` 的目标关系
3. 最后把现有样例映射到新锚点和 verification 输入协议

规划阶段不重写所有示例，只提供分类、模板和迁移路径。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript examples、pnpm workspace、Markdown docs
**Primary Dependencies**: `examples/logix/**`, `docs/ssot/runtime/07-standardized-scenario-patterns.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `specs/113-*`, `specs/116-*`, `specs/117-*`, `specs/118-*`
**Storage**: 文件系统内的 examples/specs/docs 树
**Testing**: examples inventory、anchor map、pattern reuse 检查、verification 输入样例核对
**Target Platform**: dogfooding examples 与 verification 入口
**Project Type**: examples planning 特性
**Performance Goals**: N/A，规划阶段不做性能声明
**Constraints**: 复用已能表达主线语义的现有 examples；verification 只能使用 `fixtures/env + steps + expect` 协议；docs / examples / verification 锚点必须可持续回写
**Scale/Scope**: `examples/logix/src/**` 与相关 docs anchors

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性负责把 examples 与 verification 接到同一条 authoring / validation 主线。
- **Docs-first & SSoT**: PASS。依赖 `113` 的 docs 收口结果和 `116`、`117`、`118` 的 host/domain/CLI 规划。
- **Effect / Logix contracts**: PASS。examples 只消费既定契约。
- **IR / anchors**: PASS。verification 示例不得长出第二 DSL。
- **Deterministic identity / txn boundary / React consistency**: PASS。后续示例实现必须维持这些不变量。
- **Internal contracts & trial runs**: PASS。examples 与 verification 统一围绕 trial surface。
- **Dual kernels**: PASS。examples 消费 `115` 的结果，不单独裁决。
- **Performance budget**: N/A。规划阶段不触及热路径实现。
- **Breaking changes**: PASS。允许 examples 重排，不保留旧示例叙事作为默认主线。
- **Quality gates**: PASS。examples inventory、anchor map、reuse ledger 和 verification route 是硬门。

## Perf Evidence Plan（MUST）

N/A。examples 规划特性本身不执行 perf collect。若后续样例实现触及关键路径，由相关成员 spec 处理。

## Project Structure

### Documentation (this feature)

```text
specs/119-examples-verification-alignment/
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
examples/logix/src/
├── features/
├── patterns/
├── runtime/
├── scenarios/
└── verification/
```

**Structure Decision**: 以现有 `examples/logix/src/` 为基础重排，不先推倒。现有 patterns、runtime、scenarios 中已能表达主线语义的部分优先复用。

## Complexity Tracking

无已知违例。

## Phase 0 Research

- 盘点现有 examples inventory
- 建立 docs anchor map
- 识别可复用 scenarios、patterns、fixtures 与测试
- 设计 verification 子树模板

## Phase 1 Design

### Deliverable A: Example Inventory

- 当前样例目录
- 样例类别
- 是否复用

### Deliverable B: Anchor Map

- docs 页面 -> example
- example -> verification

### Deliverable C: Verification Template

- `fixtures/env`
- `steps`
- `expect`

## Verification Plan

```bash
find examples/logix/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
rg -n 'fixtures/env|steps|expect|scenario|pattern|RuntimeProvider.layer|useProcesses' docs/ssot/runtime/*.md examples/logix/src/**
```

## Completion Rule

1. examples inventory 稳定
2. anchor map 稳定
3. verification template 稳定
4. reuse ledger 稳定
5. 后续 examples 实现可直接按 tasks 推进
