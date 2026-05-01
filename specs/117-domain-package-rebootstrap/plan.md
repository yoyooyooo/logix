# Implementation Plan: Domain Package Rebootstrap

**Branch**: `117-domain-package-rebootstrap` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/117-domain-package-rebootstrap/spec.md`

## Summary

本计划将四个领域包收敛到稳定身份与目录模板：

1. 先固定 query / form / i18n / domain 的主输出形态
2. 再固定 package template、archive 路由和 reuse ledger
3. 最后把现有目录与公开面映射到这套模板

规划阶段只做边界和模板，不直接实现新 API。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript、pnpm workspace、docs-first package planning
**Primary Dependencies**: `packages/logix-query/**`, `packages/logix-form/**`, `packages/i18n/**`, `packages/domain/**`, `docs/ssot/runtime/06-form-field-kernel-boundary.md`, `docs/ssot/runtime/08-domain-packages.md`, `docs/standards/logix-api-next-guardrails.md`, `specs/114-*`, `specs/115-*`
**Storage**: 文件系统内的 packages/specs/docs 树
**Testing**: 目录树审计、角色矩阵、reuse ledger、后续目标测试和类型检查落点设计
**Target Platform**: monorepo 内的领域包与 examples / host 邻接层
**Project Type**: domain package planning 特性
**Performance Goals**: 规划特性本身不声明性能收益；query / form 后续若触及热路径需建立 perf evidence
**Constraints**: 每个领域包只有一个主输出形态；不得长第二套 runtime；优先复用已对齐主链的实现与测试资产
**Scale/Scope**: 4 个领域包，涵盖 service-first、program-first、pattern-kit、field-kernel boundary

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性负责把领域层重新对齐到统一主链。
- **Docs-first & SSoT**: PASS。依赖 runtime 06 与 08 的事实源。
- **Effect / Logix contracts**: PASS。规划阶段不直接修改契约，只定义角色和迁移路径。
- **IR / anchors**: PASS。要求领域包仍降到同一最小运行事实。
- **Deterministic identity / txn boundary / React consistency**: PASS。后续实现若碰这些边界必须遵守已有约束。
- **Internal contracts & trial runs**: PASS。领域包不允许自长第二控制面。
- **Dual kernels**: PASS。领域包消费 `115` 的 kernel 契约，不自行裁决双核心。
- **Performance budget**: PASS。query / form 若碰热路径，后续实现必须自建证据。
- **Breaking changes**: PASS。允许目录级重组，不保留兼容层。
- **Public submodules / decomposition**: PASS。模板会约束公开层与 internal 层。
- **Quality gates**: PASS。以角色矩阵、主输出形态、reuse ledger 和模板清晰度为本特性硬门。

## Perf Evidence Plan（MUST）

对 query / form 后续实现，若变动影响 runtime 或 render critical path，必须在实现阶段建立 perf evidence。当前 planning 特性不执行 collect。

## Project Structure

### Documentation (this feature)

```text
specs/117-domain-package-rebootstrap/
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
packages/logix-query/src/
packages/logix-form/src/
packages/i18n/src/
packages/domain/src/
```

**Structure Decision**: 这是 domain family 规划特性。实现落点固定在四个领域包，目标是形成 role matrix、主输出形态表、目录模板和 reuse ledger。

## Complexity Tracking

无已知违例。

## Phase 0 Research

- 盘点四个领域包当前公开面与 internal 结构
- 固定主输出形态
- 识别可复用协议、helper、fixtures 与测试资产
- 设计 archive / rebootstrap 路线

## Phase 1 Design

### Deliverable A: Domain Role Matrix

- query = program-first
- i18n = service-first
- domain = pattern-kit
- form = 领域层表达 + field-kernel boundary

### Deliverable B: Templates And Reuse Ledger

- 公开层
- internal 层
- react 子树或 helper 子树
- reuse candidates

## Verification Plan

```bash
find packages/logix-query/src packages/logix-form/src packages/i18n/src packages/domain/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

```bash
rg -n 'service-first|program-first|field-kernel|pattern-kit|controller|runtime\\.trial' docs/ssot/runtime/*.md docs/standards/*.md
```

## Completion Rule

1. 四个领域包的主输出形态已固定
2. 包级模板与 reuse ledger 已存在
3. 旧入口去向清晰
4. 后续实现可直接按 tasks 推进
