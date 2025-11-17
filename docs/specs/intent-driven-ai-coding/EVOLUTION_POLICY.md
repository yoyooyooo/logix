---
title: 演进策略
status: living
---

> 本仓库仍处在快速演进阶段：允许破坏性变更，不要求向历史写法兼容。目标是尽快收敛到一套“可解释、可对齐、可回放”的事实源与实现形态。

## 1. 事实源与裁决

- 平台概念与术语：`99-glossary-and-ssot.md`
- 运行时术语：`.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`
- 模型与资产结构：`02-intent-layers.md`、`03-assets-and-schemas.md`、`03-module-assets.md`
- Runtime 编程模型：`.codex/skills/project-guide/references/runtime-logix/logix-core/*`
- 真实类型裁决：`packages/logix-core/src/index.ts`

## 2. 允许 breaking，但要可交接

- 发生破坏性改动时：同步更新上述 SSoT 文档，并在 `implementation-status.md` 里写一条变更摘要（1-2 行即可）。
- 如果变更影响用户文档叙事：同步更新 `apps/docs/content/docs` 的对应页面。

## 3. 清理原则

- 本目录只保留“仍在使用/仍会继续演进”的主线规范；历史与反思集中在 `decisions/`（提炼后的结论），未定稿探索集中在 `docs/specs/drafts/`，避免出现并行真相源。
