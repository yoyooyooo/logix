---
title: Studio & Canvas Integration for Capability Plugins
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-capability-plugin-blueprint.md
  - ./02-schema-capability-dual-pattern.md
---

# Studio & Canvas Integration for Capability Plugins

> 本文从 Studio / 画布视角整理“能力插件”如何出现在不同视图中：Schema 视图、Flow 视图与能力视图。

## 1. 三视图总览：压缩/解压模型

能力插件不是一个孤立的“黑盒节点”，而是在不同缩放层次上呈现为一组“压缩视图”：

1. **Schema 视图（模型/字段视图，最高压缩）**  
   - 字段级别的能力徽标与配置面板；  
   - 插件通过字段工厂（如 `Query.field`）和 Annotation 协议暴露信息。

2. **Flow 视图（交互编排视图，中等压缩）**  
   - 能力节点（Capability Node）：  
     - Source 端口：来自 State / Action / 外部事件；  
     - Core：插件定义的交互语义字段（策略、并发、错误行为等）；  
     - Sink 端口：落在 State / Action / 其他模块。

3. **能力视图（能力治理视图，跨场景透视）**  
   - 各能力插件的配置分形树（根 / 页面 / 组件）；  
   - 能力使用画像：哪些 Module / 字段 / Flow 节点在使用该插件。

这三视图都以 CapabilityPlugin 元数据为输入，只是切片角度不同。结合「Progressive Escape Hatch」中提出的压缩/解压隐喻，可以认为：

- Schema 视图是对复杂逻辑的高压缩快照；  
- Flow 视图暴露了时间轴与能力节点，便于 AI/人类微调；  
- Code / Service 视图（不在本文展开）是最低压缩的原始实现，适合 Debug 与极限逃生舱。

## 2. Schema 视图：字段级能力声明

从 CapabilityPlugin 的 SCD 面（字段工厂 + Annotation）出发，Studio 可以：

- 在 State Schema 结构中发现被某插件标记的字段；  
- 为每个字段渲染能力徽标（例如 “Query-backed” / “Socket topic” / “Track view”）；  
- 根据插件提供的 `options` Schema 生成字段级配置面板（依赖 `CapabilityMeta` 中的稳定字段，例如 kind/priority/factory/uiHints/optionsSchema）。

交互示例：

- 选中 `User.profile` 字段 → 右侧出现 “Query 能力” 面板；  
- 面板字段来自 `QueryFieldOptions` 的 Schema（key 组装、超时策略、目标字段映射等）；  
- 调整后的配置将写回字段 Annotation，供 `onScanSchema` 在运行时展开。

## 3. Flow 视图：能力节点与意图表达

通过 `onScanSchema` 展开的 Logic，可以在 Flow 画布上转化为**能力节点**：

- **Source Ports**：  
  - 反映哪些 State / Action / 外部事件触发该能力；  
  - 例如 Query 节点：`state.changed("userId")`、`action("refresh")`。

- **Core 区域**：  
  - 用插件的“交互语义字段”呈现节点内部配置：  
    - Query：刷新策略、并发模式、错误展示策略等；  
    - Socket：重连策略、订阅模式；  
    - Form Linkage：联动规则、依赖字段等。

- **Sink Ports**：  
  - 输出到 State / Action / 其他模块：  
  - 例如 Query 的 `data → state.profile`、`loading → state.loading`、`error → action.showError`。

这样，一个能力节点在 Flow 视图中表达的就是：

> “当 Source 满足 X 条件时，用能力 Y，以策略 Z 处理，并把结果落到 U/V/W。”

能力节点的结构化 IR 来自插件在 Blueprint/SCD 文档中定义的 Api 与 Annotation 协议。

## 4. 能力视图：配置与画像

利用 CapabilityPlugin 的 `config` Schema 和运行时配置实例，Studio 可以构建能力视图：

- 对每个插件：  
  - 展示全局配置（Root Runtime）和局部覆盖（各 Runtime.fork）形成的分形树；  
  - 对每个节点显示“来源”（继承还是覆写）与状态（默认 / 调整 / 实验中）。

- 对潜在依赖关系的提示（如有）：  
  - 若未来在 CapabilityPlugin 元数据中引入 `dependencies` 描述（例如 AI 插件依赖 Query 插件），Studio 可以：  
    - 在启用某插件时提示缺失的依赖；  
    - 在 Palette 中显示“推荐组合”的能力包。

- 将配置与使用点关联：  
  - 标示当前配置影响的模块、字段和 Flow 节点；  
  - 例如：某 Query 插件配置「staleTime = 5min」影响 `User.profile` 与 `Order.list` 两个模块。

这使得能力成为可治理资源，而不仅是“隐藏在代码里的库调用”。

## 5. 与 AI / 代码生成的协作点

在 Studio 中，能力插件为 AI 带来两个协作入口：

- **Schema 视图**：  
  - AI 可以基于字段语义建议合适的能力（例如将某字段标记为 Query-backed）；  
  - 自动填充插件的字段级配置（key 生成、错误映射等）。

- **Flow 视图**：  
  - AI 可以提议将已有逻辑重构为能力节点（从低层 Effect/Stream 组合提升到能力级 Pattern）；  
  - 在能力节点内部生成/优化交互配置（例如调整并发/重试策略）。

这些能力都建立在 CapabilityPlugin 蓝图所提供的结构化元数据之上。
