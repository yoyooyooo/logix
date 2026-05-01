# Implementation Plan: Declare Run Phase Contract

**Branch**: `136-declare-run-phase-contract` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/136-declare-run-phase-contract/spec.md`

## Summary

本计划把核心相位合同收成三块：

1. 公开作者面改用 declaration/run 语言
2. lifecycle、fields 与 Platform signal 固定 owner 和 phase contract
3. 内部归一化链路收成 deterministic descriptor path，并同步清理 docs/examples/tests

当前先锁语义合同，再决定最终公开拼写。
语法选择只是实现问题，不能反过来束缚 phase model。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8

## Technical Context

**Language/Version**: TypeScript、Effect、Markdown
**Primary Dependencies**: `packages/logix-core/**`, `docs/ssot/runtime/03-canonical-authoring.md`, `docs/ssot/runtime/05-logic-composition-and-override.md`, `specs/122/**`, `specs/125/**`, `specs/127/**`, `specs/129/**`
**Testing**: phase contract audit、diagnostic wording audit、authoring surface audit
**Target Platform**: `@logixjs/core` runtime authoring + docs/examples/tests
**Project Type**: pnpm workspace
**Performance Goals**: 不允许因 phase model 收口引入额外 steady-state runtime 分叉；如触及 hot path，需补 perf evidence
**Constraints**: forward-only；不保留 `{ setup, run }` canonical form；不保留 module-level `fields:` 默认写法

## Constitution Check

- NS/KF 与 `spec.md` 保持一致
- 变更直接命中 public authoring 与 runtime contract，必须 docs-first
- 若改动触及 phase diagnostics 或 hot path，需补 perf/diagnostics 证据
- breaking change 按 forward-only 处理，不保留兼容层

## Perf Evidence Plan（MUST）

- 默认先标注为 conditional
- 若只改公开 authoring 词汇与归一化链路，不命中 steady-state hot path，可在实施时记录 `N/A`
- 若改动触及 logic canonicalization、phase guards、runtime install order 或 diagnostics hot path，需在实施前补可比 evidence

## Project Structure

```text
specs/136-declare-run-phase-contract/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── tasks.md
```

## Structure Decision

- 本 spec 先锁定 phase contract 与 internal descriptor contract
- 具体文件改动、验证命令与 docs 回写在 tasks 阶段细化

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 同时改公开词汇与内部归一化链路 | 需要一次性收掉旧相位对象 | 只改文案无法真正收口，旧实现心智会继续回流 |
