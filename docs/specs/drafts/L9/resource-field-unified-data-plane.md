---
title: 'Resource Field: 统一数据平面的草案'
status: draft
version: 0.1.0
value: vision
priority: 1700
related:
  - ../topics/query-integration/06-unified-data-vision.md
  - ../topics/query-integration/07-schema-link-deep-dive.md
---

# Resource Field: 统一数据平面的草案

> 核心想法：在 v3 中引入更抽象的 `ResourceField` 概念，将 Query/Socket/Storage/AI 等所有“有来源的字段”统一建模，而不是为每个后端技术做一套平行 API。

## 1. 出发点

- `query-integration` Topic 中的 `Query.field` / `Socket.field` / `Storage.field` / `Link.to` 实际上都是“字段来自某个 Resource”的特例；
- AI Native Core 中将 `AiOutput` 映射到 State Schema，也是同一类问题：字段由外部推导或拉取；
- 当前草案容易演化成多个独立 mini-framework（Reactive.*、@logix/query、AI 集成），增加实现复杂度。

## 2. 草案方向

- 在 Schema 层抽象出 `ResourceField` 的元模型，例如：
  - `kind`: `"query" | "socket" | "storage" | "ai" | "env" | ...`；
  - `source`: 用于描述如何与外部系统交互（QueryClient、WebSocketService、AiService 等）；
  - `relation`: 可选的 Schema Link 信息，用于声明与其他 Module State 的关联；
- ModuleRuntime 始终只持有纯 JSON 状态，所有 Resource 行为在装配阶段（Module.live / Logic 链）被编译成 Flow/Link；
- 将 Query Integration / AI Native Core / External Integration 示例都视为 ResourceField 的 adapter，而不是并列的核心抽象。

## 3. 预期落点

- 若方向验证可行，长远看应进入：
  - `docs/specs/runtime-logix/core` 的 State/Store 章节，作为统一的数据范式；
  - `docs/specs/intent-driven-ai-coding/v3` 中的 Data/Domain Intent 描述；
- 在此之前，本草案仅作为「概念收敛点」，不会直接驱动实现。

