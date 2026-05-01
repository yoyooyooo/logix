---
title: Skill 一致性核对清单（llms-ready）
---

# Skill 一致性核对清单（llms-ready）

用于在每次修改 `logix-best-practices` 后确认：`SKILL.md` 与 `references/*` 没有漂离当前 frozen API shape。

## 1) 入口与阅读路线

- `SKILL.md` 是否把 `references/agent-first-api-generation.md` 放在 API 生成 / 评审入口。
- `references/task-route-map.md` 是否仍能覆盖业务、核心、对齐实验三类用户。
- 资源导航链接是否完整可达。
- `references/llms/README.md` 是否追加当前 API 生成守则。

## 2) 当前 API shape

以下约束是否在 `SKILL.md` 或 `references/agent-first-api-generation.md` 明确出现：

- `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`。
- React read 只走 `useSelector(handle, selector)`。
- Form 领域按 `source / companion / rule / submit` 分 lane。
- 默认验证代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial`，不生成 compare 调用。
- 不新增 Form hook family、public path carrier、public row owner token、second fact namespace、public scenario/report noun。

## 3) Runtime 硬约束

- 稳定锚点：`instanceId/txnSeq/opSeq/tickSeq`。
- 事务窗口禁止 IO/await/dispatch/`run*Task`。
- 业务不可写 `SubscriptionRef`。
- 诊断事件 Slim + JsonValue + 可解释降级。

## 4) 资产边界

- LLM 基础包应规则优先、示例最小。
- `references/agent-first-api-generation.md` 必须自包含，不依赖外部事实源或本地工程路径。
- skill 安装包只保留当前 API 示例。

## 5) 质量门表达

- DoD 是否保持：类型检查 -> lint -> 非 watch 测试。
- 核心路径改动是否仍要求 perf + diagnostics 证据闭环。

## 6) 快速漂移扫描

```bash
# <skill-root> 即 SKILL.md 所在目录
rg -n "second hook family|public path carrier|public row owner token|public scenario/report noun|root compare facade" <skill-root>/SKILL.md <skill-root>/references
rg -n "Module\\.logic|Program\\.make|Runtime\\.make|source|companion|useSelector|Logix\\.Runtime\\.trial" <skill-root>/SKILL.md <skill-root>/references
```
