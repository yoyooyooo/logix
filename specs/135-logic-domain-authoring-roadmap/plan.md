# Implementation Plan: Logic Domain Authoring Convergence Roadmap

**Branch**: `135-logic-domain-authoring-roadmap` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/135-logic-domain-authoring-roadmap/spec.md`

## Summary

本计划把这轮收口视为一个总控 spec group，重点不是直接改代码，重点是把四条 implementation stream 的边界、顺序、证据回写与 docs-first gate 固定下来：

1. `136` 固定 declare/run 核心相位合同
2. `137` 收口 Form 默认作者面与 field-kernel expert 边界
3. `138` 收口 Query 的 program-first 输出与 shared declaration contract
4. `139` 收口 I18n 的 service-first 身份与 driver lifecycle 接线

当前刻意不把 `@logixjs/domain` 放进这一轮 primary scope。
若 `136-139` 的 planning 明确证明它被同一相位合同直接卡死，再补独立 member spec。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript、Markdown
**Primary Dependencies**: `docs/ssot/runtime/03-canonical-authoring.md`, `docs/ssot/runtime/05-logic-composition-and-override.md`, `docs/ssot/runtime/06-form-field-kernel-boundary.md`, `docs/ssot/runtime/08-domain-packages.md`, `specs/122/**`, `specs/125/**`, `specs/127/**`, `specs/129/**`
**Testing**: scope audit、registry audit、docs-first drift audit
**Target Platform**: repo-level docs/specs governance
**Project Type**: pnpm workspace + SpecKit
**Performance Goals**: 本 spec 自身不直接改 hot path；需要为 member 指定 perf/diagnostics evidence gate
**Constraints**: forward-only；不保留兼容层；`135` 不复制 member 的实现任务

## Constitution Check

- NS/KF 已在 `spec.md` 与本计划保持一致
- 本计划只承接总控治理，不新增第二组 specs truth source
- 任何 contract 改动都必须先回写 `docs/ssot/runtime/*`
- breaking change 统一按 forward-only 处理，不设兼容层与弃用期
- `135` 自身不触发 runtime hot path 实施，但会要求 `136-139` 在命中核心路径时补 perf evidence

## Perf Evidence Plan（MUST）

N/A

说明：

- `135` 本身不直接改运行时代码
- `136-139` 进入实施时，若触及 hot path、diagnostics 或 package public surface，必须各自在 plan.md 中补 perf evidence 与 diagnostics gate

## Project Structure

```text
specs/135-logic-domain-authoring-roadmap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── spec-registry.json
├── spec-registry.md
├── checklists/
│   ├── requirements.md
│   └── group.registry.md
└── tasks.md
```

## Structure Decision

- `135` 是 Spec Group，总控职责固定为 registry、顺序、gate、证据回写与入口导航
- 具体实施细节全部下沉到 `136-139`
- `122 / 125 / 127 / 129` 只算可修订基线，不算不可重写前提
- 若 planning 证明有新增 primary workstream，必须拆新 member spec，禁止挤进现有 scope
- `tasks.md` 暂不创建，等用户确认子 spec 边界与其它产物后再按 `$writing-plans` 模板展开

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 以 group spec 承接多条工作流 | 需要一个单入口协调 `136-139` | 直接平铺独立 spec 会丢失顺序、gate 与统一路由 |
