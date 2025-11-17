---
title: 约束与质量意图（Constraint & Quality Intent）
status: draft
version: 2
---

> 本文定义横切的约束/质量意图。它不会单独生成代码，而是约束其它意图层（Layout/View/Interaction/Behavior/Data/CodeStructure）的实现与运行时行为。

## 1. 定义

约束/质量意图回答：

- 性能：
  - 列表最多展示多少条数据？
  - 是否需要分页/虚拟滚动？
- 安全：
  - 是否涉及敏感数据？
  - 是否必须鉴权、脱敏？
- 兼容性：
  - 是否必须遵守“Never break userspace”？
  - 是否存在历史接口或老版本客户端？
- 可观测性：
  - 是否必须记录审计日志？
  - 是否需要 tracing/metrics？

## 2. ConstraintIntent Schema 草图

```ts
interface ConstraintIntent {
  performance?: {
    maxItemsPerPage?: number
    latencyBudgetMs?: number
    requireVirtualScroll?: boolean
  }
  safety?: {
    requireAuth?: boolean
    sensitiveFields?: string[]
  }
  compatibility?: {
    neverBreakUserspace?: boolean
    legacyApis?: string[]
  }
  observability?: {
    requireAuditLog?: boolean
    tracing?: boolean
    metrics?: boolean
  }
}
```

可以作为 metadata 附着在：

- IntentSpecV2.constraints；
- PatternSpecV2.constraints；
- PlanSpecV2.constraints；
- FlowIntent/Effect runtime 的配置中。

## 3. Effect-ts 与约束意图

Effect-ts 是实现约束意图的重要位置：

- 在行为/流程层：
  - 使用 Effect 组合来实现重试/超时/circuit breaker；
  - 为敏感操作统一注入审计日志与 tracing。
- 在 Code Structure 层：
  - 将通用中间件（性能/安全/可观测性）封装为可复用的 Effect 模块；
  - 平台从 ConstraintIntent 中生成对应的 Effect 组合骨架。

## 4. LLM 的角色

LLM 可以：

- 根据 ConstraintIntent 审查现有 Intent/Pattern/Plan/Flow，指出潜在风险（如分页缺失、未鉴权接口）；
- 生成或调整 Effect/Plan 以满足这些约束（例如加上分页、增加审计调用）。
