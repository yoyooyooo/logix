# Implementation Plan: I18n Logic Contract Cutover

**Branch**: `139-i18n-logic-contract-cutover` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/139-i18n-logic-contract-cutover/spec.md`

## Summary

本计划把 I18n 的收口拆成三块：

1. 写死 `services.i18n + token contract` 为默认主身份
2. 让 driver lifecycle wiring 接入 shared declaration contract
3. 写死 root exports 的 keep 或 remove 或 move ledger，并降级 projection、snapshot 与 root/global 解析语义

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript、Effect、Markdown
**Primary Dependencies**: `packages/i18n/**`, `packages/logix-core/**`, `docs/ssot/runtime/08-domain-packages.md`, `specs/127/**`, `specs/136/**`, `specs/129/**`
**Testing**: service-first surface audit、driver lifecycle wiring audit、projection demotion audit
**Target Platform**: `@logixjs/i18n` package surface + docs/examples/tests
**Project Type**: pnpm workspace
**Performance Goals**: 不允许因 contract 收口破坏 driver ready/reset 语义；若触及 lifecycle path 或 diagnostics，实施时补证据
**Constraints**: forward-only；projection 不回默认主叙事；root/global 解析不回 day-one path

## Constitution Check

- NS/KF 与 `spec.md` 保持一致
- I18n 必须服从 `127` 的 service-first 方向与 `136` 的 declaration/run 合同
- 不允许因 async ready 或 projection 需求在包内长出独立 lifecycle 叙事
- 若触及 driver lifecycle path 或 diagnostics，需补 perf/diagnostics evidence

## Perf Evidence Plan（MUST）

- 默认按 conditional 处理
- 只改 root exports、文档与 examples 时可记 `N/A`
- 若调整 driver lifecycle wiring、reset/ready 传播或 diagnostics path，则必须补可比 evidence

## Project Structure

```text
specs/139-i18n-logic-contract-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── tasks.md
```

## Structure Decision

- 先锁定 service-first、auxiliary projection、expert root/global 三层
- 再统一 package root、docs、examples、tests 的默认词汇

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 同时改 service 叙事与 lifecycle wiring 叙事 | I18n 默认身份与接线方式强耦合 | 只收一层会留下 service-first 与 projection-first 双轨 |
