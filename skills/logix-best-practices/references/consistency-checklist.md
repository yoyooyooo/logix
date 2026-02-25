---
title: 文档与实现一致性核对清单（llms-ready）
---

# 文档与实现一致性核对清单（llms-ready）

用于在每次修改 `logix-best-practices` 后确认：`SKILL.md`、`references/*`、`assets/*`、`scripts/*` 与目标项目 SSoT/源码口径一致。

## 1) 入口与阅读路线

- `SKILL.md` 是否保留 L0-L3 选路入口。
- `references/task-route-map.md` 是否仍能覆盖业务/核心/平台三类用户。
- 资源导航链接是否完整可达（无失效路径）。
- `references/llms/README.md` 与 `01~08` 是否齐全可读。

## 2) 北极星硬约束（必须显式可见）

以下约束是否在 `SKILL.md` 或 `references/north-star.md` 明确出现：

- `Static IR + Dynamic Trace` 单一事实源。
- 稳定锚点：`instanceId/txnSeq/opSeq/tickSeq`。
- 事务窗口禁止 IO/await/dispatch/`run*Task`。
- 业务不可写 `SubscriptionRef`。
- 诊断事件 Slim + JsonValue + 可解释降级。
- `*.make` 命名约定。
- Playground/Sandbox 作为 Alignment Lab（非普通 runner）。

## 3) 可移植性（独立对外）

- references 中不出现仓库私有路径清单（如 `docs/ssot/*`、`packages/*`）。
- “如何用”信息优先内化到 skill 文档，不依赖仓库 README 外跳。
- 若需要项目级路径，统一放在 `references/llms/99-project-anchor-template.md`（可选）。

## 4) 资产与脚本一致性

- `references/feature-first-minimal-example.md` 与 `assets/feature-first-customer-search/src` 是否一一对应。
- `scripts/scaffold-feature-first.mjs` 默认不覆盖行为是否与文档一致。
- `scripts/check-pattern-reuse.mjs` 参数说明是否与 `references/workflow.md` 一致。

## 5) 质量门表达

- DoD 是否保持：类型检查 → lint → 非 watch 测试。
- 核心路径改动是否仍要求 perf + diagnostics 证据闭环。

## 6) 快速漂移扫描（可选）

```bash
# <skill-root> 即 SKILL.md 所在目录
rg -n "Static IR|Dynamic Trace|instanceId|txnSeq|opSeq|SubscriptionRef|JsonValue|Alignment Lab|run\*Task|linkDeclarative|\\.make\\(" <skill-root>
rg -n "docs/ssot|packages/logix|intent-flow|\\.\\./\\.\\./README\\.md|README\\.zh-CN" <skill-root>
```
