---
title: 演进策略（v3）
status: draft
version: 1
---

> v3 仍处在快速演进阶段：允许破坏性变更，不要求向历史版本兼容。目标是尽快收敛到一套“可解释、可对齐、可回放”的事实源与实现形态。

## 1. 事实源与裁决

- 概念与术语：`99-glossary-and-ssot.md`
- 模型与资产结构：`02-intent-layers.md`、`03-assets-and-schemas.md`、`03-module-assets.md`
- Runtime 编程模型：`docs/specs/runtime-logix/core/*`
- 真实类型裁决：`packages/logix-core/src/index.ts`

## 2. 允许 breaking，但要可交接

- 发生破坏性改动时：同步更新上述 SSoT 文档，并在 `implementation-status.md` 里写一条变更摘要（1-2 行即可）。
- 如果变更影响用户文档叙事：同步更新 `apps/docs/content/docs` 的对应页面。

## 3. 清理原则

- v3 下只保留“仍在使用/仍会继续演进”的文档；历史探索应放到 v2（或 drafts），避免在 v3 造成二次事实源。
