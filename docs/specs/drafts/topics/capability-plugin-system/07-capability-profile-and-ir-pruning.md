---
title: Capability Profile & IR-Driven Pruning
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-capability-plugin-blueprint.md
  - ./02-schema-capability-dual-pattern.md
  - ./05-studio-and-canvas-integration.md
  - ./06-ai-facing-plugin-schema.md
---

# Capability Profile & IR-Driven Pruning

> 目标：把“能力 profile + IR 驱动裁剪”从讨论固化为一条清晰的编译期流水线，回答：
>
> - 如何从 Schema/Flow IR 反推“这个入口/Runtime 真的需要哪些能力 Layer/包”？
> - 如何用这份 Profile 反向生成 Runtime 入口 / 构建配置，从而做到“只打包用到的能力”？

## 1. 背景与问题

- 能力插件体系引入后，某个入口的 Runtime 通常形态为：
  - `Runtime.make(RootImpl, { layer: Layer.mergeAll(Query.layer(...), Router.layer(...)) })`
- 问题：
  - 目前插件列表多半由人工/脚手架维护，很容易出现：
    - 已经不再使用某能力，但入口仍然注册对应插件（bundle 冗余）；
    - 代码中已经使用 `$.xxx` / `X.field`，但入口忘记注册插件（运行时报错）。
  - bundler 的 tree-shaking 无法理解 Logix/SCD/Flow 语义，不能仅凭 JS import 安全裁剪能力 Layer。

本草案提出：利用已有 IR（Schema Annotation + Flow/IntentRule IR），在构建期自动推导 **Capability Profile**，并据此驱动入口代码和打包过程。

## 2. 核心概念：Capability Usage IR → Capability Profile

### 2.1 能力使用 IR（Capability Usage IR）

在现有 Parser/Studio 基础上，定义一类中间表示，用于描述“在哪些模块/链路上使用了哪些能力”：

```ts
interface CapabilityUsageIR {
  modules: {
    [moduleId: string]: {
      capabilities: string[] // e.g. ["query", "router"]
      fields: {
        [fieldName: string]: string[] // e.g. ["query"]
      }
      chains: Array<{
        id: string // e.g. "userId→profile"
        capabilities: string[] // e.g. ["query"]
      }>
    }
  }
}
```

来源：

- Schema 层：字段 Annotation（如 `Query.field`、`Track.view`）映射到字段级能力使用；
- Flow 层：`Query.query($, ...)` / `Router.push($, ...)` / `Track.event($, ...)` 等 Helper 调用映射到链路级能力使用。

### 2.2 能力 Profile（Capability Profile）

基于 CapabilityUsageIR，为某个入口/Runtime 生成的聚合视图：

```ts
interface CapabilityProfile {
  layers: Array<{
    id: string // "query" / "router" / "track"...
    package: string // 包名，如 "@logix/plugin-query"
    config?: unknown // 入口级默认配置（可选）
  }>
}
```

区分：

- Usage IR：细粒度（module/field/chain 级），主要给 Studio/AI/分析用；
- Profile：粗粒度（入口/Runtime 级），主要给构建系统和 Runtime 入口用。

## 3. 编译期流水线（概念）

### 3.1 步骤 1：从 IR 收集能力使用

1. Parser 针对目标入口（或一组入口）生成 Schema/Flow IR；
2. 汇总为 CapabilityUsageIR，记录所有出现过的能力 id。

### 3.2 步骤 2：生成能力 Profile

1. 收集所有出现过的能力 id 集合 `C = {query, router, track, ...}`；
2. 结合项目配置（例如哪些能力在这个入口必须禁用/启用），生成 CapabilityProfile：

```ts
export const capabilityProfile: CapabilityProfile = {
  layers: [
    { id: 'query', package: '@logix/plugin-query', config: { staleTime: 5000 } },
    { id: 'router', package: '@logix/plugin-router', config: { type: 'history' } },
    // 未使用 "track" 则不出现在列表中
  ],
}
```

### 3.3 步骤 3：由 Profile 生成 Runtime 入口

用 Profile 作为输入，生成入口代码（或辅助入口）：

```ts
// runtime.generated.ts（由 Profile 自动生成）
import { Logix } from '@logix/core'
import { Layer } from 'effect'
import { Query } from '@logix/plugin-query'
import { Router } from '@logix/plugin-router'

import { RootImpl } from './modules'

export const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(Query.layer({ staleTime: 5000 }), Router.layer({ type: 'history' })),
})
```

构建系统只需要从这里的 import 推导打包依赖；未列入 Profile 的能力不会被 import，自然不会被打包。

## 4. Studio / AI / 治理向的价值

- **体积控制**：
  - 每个入口/子应用只携带自身 IR 中真实使用到的能力插件；
  - 多 Runtime/多入口场景下可以输出能力矩阵，整体压缩能力堆叠。

- **一致性检查**：
  - 对比“IR 使用集合”和“手写插件列表”，发现：
    - 注册了但没有使用的能力（可提示裁剪）；
    - 使用了但未注册的能力（构建期直接报错）。

- **治理与权限**：
  - 在 Profile 层做“能力白名单/黑名单”，例如某入口禁止使用外呼类能力（AI/HTTP 等）；
  - 为 AI 提供“当前入口可用能力集”，引导出码时只在允许能力范围内规划逻辑。

## 5. 开放问题（草）

1. **动态能力调用的处理**
   - 若出现动态索引 `$[id]` 或反射式调用，IR 难以静态发现；
   - 是否需要规范 Platform-Grade 能力的使用方式（禁止动态索引），以换取裁剪与分析能力？

2. **Profile 与手写配置的合并策略**
   - Profile 是完全自动生成，还是允许手写 override（例如强制启用某能力以备未来 use case）？
   - 合并/冲突策略如何在文档中定义？

3. **多入口 / 多 Runtime 场景下 Profile 的组织方式**
   - 是每个入口一个 Profile 文件，还是允许为一组入口定义共享 Profile 并在其上打补丁？

后续若这条方案被验证有价值，可在 `runtime-logix/core` 与 Studio 规范中增加“Capability Profile & Build Integration”一节，将其中稳定部分上升为正式规范。
