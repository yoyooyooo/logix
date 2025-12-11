---
title: State Graph & Field Capabilities
status: draft
value: core
priority: next
related:
  - ../reactive-and-linkage/01-reactive-paradigm.md
  - ../reactive-and-linkage/03-unified-resource-field.md
  - ../query-integration/06-unified-data-vision.md
  - ../capability-plugin-system/01-capability-plugin-blueprint.md
---

# State Graph & Field Capabilities

> 统一梳理「字段能力 (Field Capabilities)」与「State Graph」心智，把目前分散在 Reactive & Linkage / Query Integration / Capability Plugin System 里的方案收束成一条主线。

## 1. 主题定位

本 Topic 聚焦三件彼此强相关、但历史上分散在多个 Topic 里的内容：

- **字段能力 (Field Capabilities)**：`Computed / Source / Link` 三类字段的统一建模方式；
- **State Graph 视角**：将 Module 视为 Data Graph / State ORM 节点的整体心智（字段 = 形状 + 来源 + 关系）；
- **能力插件 (Capability Plugin)**：通过 `CapabilityMeta` + Factory 在 `Module.live` 阶段自动把 Schema Blueprint「编译」为 Logic / Flow / Link。

目标是：

- 给「字段从哪来、如何保持最新」提供一个统一的抽象层，而不是在 Reactive / Query / Linkage / AI 等子主题中各写一套；
- 为 runtime-logix/core 中的正式规范准备「字段能力」的 SSoT 蓝图，后续实现与 DevTools/IR 只需要对齐这一套模型。

## 2. 文档结构

本 Topic 计划包含两类文档：

1. **骨干蓝图（本目录内）**
   - `01-field-capabilities-overview.md`：统一定义 `Computed / Source / Link` 以及它们与 Capability Plugin / State Graph 的关系，是本 Topic 的主入口。
   - 后续若需要，可以在本目录继续扩展 `0x-*` 文档，用于收敛实现约束、迁移路径与反例。
2. **已存在的专题文档（位于其他 Topic 中）**
   - Reactive & Linkage
     - `reactive-and-linkage/01-reactive-paradigm.md`：定义 Reactive Helper / Reactive Schema，以及 `Reactive.computed($, ...)` 的 Helper 形态。
     - `reactive-and-linkage/03-unified-resource-field.md`：提出 ResourceField 草案，从视角上与 `Source` 系字段高度重叠。
   - Query Integration
     - `query-integration/06-unified-data-vision.md`：提出「Unified Data Vision / State Graph」心智，并给出 `Computed.field / Query.field / Link.to(...)` 等 API 草图。
   - Capability Plugin System
     - `capability-plugin-system/01-capability-plugin-blueprint.md`：定义 `CapabilityMeta` 元数据协议与 Factory 形态，是所有字段能力插件的通用骨架。

本 Topic 不会复制这些文档的全部内容，而是作为「纲领与索引」，明确它们在统一模型下各自承担的角色，并对齐到同一套术语。

## 3. 与 runtime-logix/core 的关系

短期内：

- 运行时已经在 `core/03-logic-and-flow.md`、`core/08-usage-guidelines.md` 中给出了 L1/L2 联动的推荐写法（`$.onState` 维护派生字段、`$.use + $Other.changes` 做跨 Module 联动），这些可以被视为「未显式命名的 Computed/Link 能力」；
- 本 Topic 的任务是为这些已经存在的行为整理出统一的字段能力模型，并与 Schema / Capability 插件方案对齐。

中长期：

- 当 `Computed.field / Source.field / Link.to` 等能力收敛并实现后，对应的规范将补充/前移到 `docs/specs/runtime-logix/core` 与 `impl` 下；
- 本 Topic 将更多承担「演进与迁移记录」的角色，记录从 Fluent DSL → 字段能力插件 → 完整 State Graph 的迭代过程。

