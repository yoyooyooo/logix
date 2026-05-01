# Implementation Plan: Query Logic Contract Cutover

**Branch**: `138-query-logic-contract-cutover` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/138-query-logic-contract-cutover/spec.md`

## Summary

本计划把 Query 的收口拆成三块：

1. 写死 `Query.make(...)` 为默认主输出
2. 让 query declarations 接入 shared declaration contract
3. 写死 root exports 的 keep 或 move 或 remove ledger，并统一 cache truth 叙事

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript、Effect、Markdown
**Primary Dependencies**: `packages/logix-query/**`, `packages/logix-core/**`, `docs/ssot/runtime/08-domain-packages.md`, `specs/127/**`, `specs/136/**`
**Testing**: package export audit、program-first authoring audit、cache truth audit
**Target Platform**: `@logixjs/query` package surface + docs/examples/tests
**Project Type**: pnpm workspace
**Performance Goals**: 不允许因 surface 收口破坏 query refresh/invalidate/cache reuse 语义；若触及 query runtime path，实施时补证据
**Constraints**: forward-only；不保留 `fields` root default path；不保留第二 cache truth

## Constitution Check

- NS/KF 与 `spec.md` 保持一致
- Query 必须服从 `127` 的 program-first 方向与 `136` 的 declaration/run 合同
- 不允许新增第二套 query runtime 或 query-only 作者面主链
- 若触及 query runtime path、refresh/invalidate 调度或 diagnostics，需补 perf/diagnostics evidence

## Perf Evidence Plan（MUST）

- 默认按 conditional 处理
- 只改 root exports、文档与 examples 时可记 `N/A`
- 若调整 auto-trigger、invalidate、cache projection 或 query runtime wiring，则必须补可比 evidence

## Project Structure

```text
specs/138-query-logic-contract-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── tasks.md
```

## Structure Decision

- 先锁定 default program kit、integration layer、expert route 三层
- 再统一 root exports、docs、examples、tests 的 package 叙事

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 同时改主输出与 integration layer 叙事 | Query 默认心智与 helper 边界高度耦合 | 只收一层会留下双轨主叙事 |
