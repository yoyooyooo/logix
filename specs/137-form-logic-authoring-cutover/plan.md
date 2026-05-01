# Implementation Plan: Form Logic Authoring Cutover

**Branch**: `137-form-logic-authoring-cutover` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/137-form-logic-authoring-cutover/spec.md`

## Summary

本计划把 Form 的收口拆成三块：

1. 写死 `Form.make + Form.from(schema).logic(...)` 这条 canonical path
2. 重分层 `rules / derived / fields / commands / root barrel`
3. 清理 docs/examples/tests，让 field-kernel 只停在 expert route

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript、React、Markdown
**Primary Dependencies**: `packages/logix-form/**`, `packages/logix-core/**`, `packages/logix-react/**`, `examples/logix/**`, `examples/logix-react/**`, `docs/ssot/runtime/06-form-field-kernel-boundary.md`, `specs/125/**`, `specs/136/**`
**Testing**: authoring surface audit、package export audit、canonical example audit
**Target Platform**: `@logixjs/form` package surface + examples + docs
**Project Type**: pnpm workspace
**Performance Goals**: 若触及 field-kernel wiring 或 validate/diagnostics path，实施时补对应证据
**Constraints**: forward-only；不保留 `rules / derived / fields` 多条等权默认入口

## Constitution Check

- NS/KF 与 `spec.md` 保持一致
- Form 默认作者面必须服从 `136` 的 declaration/run 合同
- docs 与 canonical examples 需同步回写，避免 package root 与文档漂移
- 若涉及 field-kernel hot path、validate path 或 diagnostics，需补可比 evidence

## Perf Evidence Plan（MUST）

- 默认按 conditional 处理
- 只改 docs、root exports、默认作者面文案时可记 `N/A`
- 若调整 validate wiring、fields merge、field-kernel runtime path，则必须补 perf/diagnostics evidence

## Project Structure

```text
specs/137-form-logic-authoring-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── tasks.md
```

## Structure Decision

- 先锁定 default、helper、expert 三层
- 再下沉到 root exports、examples、tests 与 docs 的统一回写

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 同时改 package root、examples、docs | 需要一次性统一默认心智 | 只改源码不改示例会继续制造平行真相源 |
