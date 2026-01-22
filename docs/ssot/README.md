---
title: SSoT Root（平台 + 运行时）
status: living
---

# SSoT Root（平台 + 运行时）

本目录是本仓 **单一事实源（SSoT）** 的聚合根，分为三层：

1. `platform/`：平台概念/模型/契约（原 `docs/ssot/platform`）。
2. `runtime/`：Logix 运行时规范与 API/契约索引（原 `docs/ssot/runtime`）。
3. `handbook/`：工程手册与导航索引（非裁决来源，原 `docs/ssot/handbook/*.md`）。

## 裁决优先级（冲突时）

1. `docs/ssot/platform/**`
2. `docs/ssot/runtime/**` + `packages/logix-*` 的真实类型/实现
3. `docs/specs/sdd-platform/workbench/**`（平台 UX/闭环草案）
4. `docs/specs/sdd-platform/impl/**` / `docs/specs/sdd-platform/agents/**`（实现备忘）
5. `examples/**`

## 其它入口（非裁决来源）

以下目录均为非裁决来源；如与 SSoT 冲突，以 SSoT 为准并回写。

- 未定稿探索：`docs/specs/drafts/**`
- 单特性交付：`specs/<id>/**`
- 对外用户文档：`apps/docs/content/docs/**`
- 实现视角导航：`docs/ssot/handbook/reading-room/impl-notes/**`
- 设计哲学与原则叙事：`docs/ssot/handbook/reading-room/philosophy/**`
- 评审与证据/差距复盘：`docs/ssot/handbook/reading-room/reviews/**`
