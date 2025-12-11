---
title: AI-Facing Capability Plugin Schema
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-capability-plugin-blueprint.md
  - ./05-studio-and-canvas-integration.md
---

# AI-Facing Capability Plugin Schema

> 本文从 AI / Agent 视角，整理如何将 CapabilityPlugin 元数据暴露为“能力 Schema”，供出码与规划使用。
> 上游关联：`Forward-Only AI Coding` 描述了 Pattern‑Rich / Schema‑Less 的极端正向模式；`From Requirement to Schema` 描述了 Intent Pipeline（L0 需求 → L9 Schema）的上游链路，本稿聚焦其下游的“能力层”。

## 1. AI 侧需要知道什么？（能力视角）

对于每一个 CapabilityPlugin，AI 理想中需要获取：

- **能力标识**：`id`、简短描述、适用场景；
- **公共 Api 形状**：Bound Helper 形式 `Helper($, config)`（方法名、参数结构、错误语义）；
- **配置维度**：`config` Schema（字段含义、默认值、取值范围）；
- **安全与幂等信息**（可选）：是否幂等、是否外呼、是否需要用户授权等。

在 Schema‑Rich 模式下，这些信息可以帮助 AI：

- 在没有人类干预时，根据目标交互自动选择合适的能力；
- 生成合理的默认配置，并在需要时提示人类调整关键策略；
- 在 Schema / Flow 图中插入、修改、重构能力节点。

在 Forward‑Only / Pattern‑Rich 模式下，AI 即便不立即生成 Schema / 画布节点，也可以：

- 仅基于能力 Api 和 Pattern 生成 Logic / Effect 代码；
- 事后再由平台/Agent 尝试“向上压缩”，将高价值片段回填到 Schema / Flow 视图中。

## 2. 能力 Schema 的导出形式（概念）

在实现上，可以为每个 CapabilityPlugin 约定一个可序列化的描述结构，例如：

```ts
interface CapabilityDescription {
  id: string
  summary: string
  category: 'data' | 'navigation' | 'form' | 'analytics' | 'ai' | string

  api: {
    // 对应 Query.query($, ...) / Query.invalidate($, ...) 等 Helper
    methods: Array<{
      name: string
      params: Schema.Schema<any> // 结构性参数描述
      resultKind: 'effect' | 'void'
    }>
  }

  config: Schema.Schema<any> // 与插件 config 一致

  traits?: {
    idempotent?: boolean
    externalCall?: boolean
    recommendedFor?: string[]
  }
}
```

该描述可以在构建时或运行时导出给 AI Agent，作为“能力词典”。

## 3. 与 Intent Pipeline / Schema / Flow 视图的关联

AI 不仅需要知道能力长什么样，还需要知道它在哪里被使用：

- 从 Schema 视图：
  - 能力被哪些字段引用（通过字段 Annotation）；
  - 字段的业务语义（来自 v3 SSOT / Domain Schema）。

- 从 Flow 视图：
  - 能力节点处于哪些链路上（例如“搜索 → Query 节点 → 列表渲染”）；
  - 上游/下游节点的意图（Filter / Transform / Side Effect）。

结合这两类信息，AI 可以：

- 判断现有能力是否适合新需求；
- 在保持现有链路结构的前提下，建议调整配置或替换能力；
- 在添加新能力时，自动找到合理的插入点和连线方式。

在 Intent Pipeline 视角下，能力 Schema 主要服务于 Pipeline 的中后段：

- 从 L0/L1 需求与领域模型出发，AI 选择合适的 CapabilityPlugin（如 Query / Router / Form / AI）；
- 在 L9 Schema 结晶阶段，为字段/模块加上合适的能力 Annotation（SCD 表层）；
- 在 Logic 生成阶段，决定是直接调用 `Helper($, config)` 形式的 Pattern，还是优先通过 Schema → `onScanSchema` 的路径生成能力节点。

## 4. 能力 Schema 与 Prompt/工具协议的关系

能力 Schema 可以作为 AI 工具协议的基础：

- 在多模型 / 多 Agent 场景中，CapabilityPlugin 描述的是“本 Runtime 中可用的本地能力”；
- Prompt 可以通过“能力名称 + 参数 Schema”引导模型正确调用本地能力，而不是任意构造 HTTP 调用；
- 在未来，CapabilityPlugin 可作为“本地工具”一等公民暴露给 Agent Runtime。

这为“Intent → Flow → Code”链路提供了一个可编排的、易验证的能力层。
