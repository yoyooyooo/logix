---
title: State-First Logix Module Codegen（TanStack Router 风格）
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./module-actions-and-reducers-redesign.md
  - ../L5/dsl-evolution-roadmap.md
---

# State-First Logix Module Codegen · TanStack Router 启发下的极致方案

> 目标：**业务侧只定义 State Schema + Metadata，其余（Actions / Reducers / Module 实现 / 类型文件）全部由工具链生成**，同时保持与现有 Logix Runtime 契约兼容。

本草稿承接：

- `L5/dsl-evolution-roadmap.md`：关于 Logix DSL 与语法糖的整体演进路线；
- `L9/module-actions-and-reducers-redesign.md`：Module Action/Reducer 形态重构；
- 对标 TanStack Router 的“单一事实源 + 代码生成 + IDE 深度集成”路线。

核心问题：**如何在「只写 State」的前提下，既保持极致 DX，又不牺牲 dispatch/_tag/actions.* 的类型安全与 Runtime 简洁性？**

---

## 1. 目标与约束

### 1.1 目标

1. **State-First DX**  
   - 业务只需要维护一个“设计文件”：State Schema + 必要的行为注解；
   - 不再手写 Action Map 与样板 Reducer。

2. **强类型不打折**  
   - Logic / Runtime 中：
     - `dispatch` 的 `_tag` 必须是字面量联合；
     - `actions.foo(payload)` 的 payload 类型完全从 State 推导；
     - `$.onAction('foo')` / `ModuleHandle.actions.foo` 等 API 仍然精准。

3. **Runtime 保持朴素**  
   - `@logix/core` 不做复杂 AST/元编程，只消费“生成好的 Module 实现”；
   - 工具链（CLI / Vite 插件）负责把设计文件翻译成普通 TS 代码。

4. **渐进引入**  
   - 允许老写法（显式 `Module.make({ state, actions, reducers })`）与新方案并存；
   - 优先在 Sandbox / PoC 模块中试点，不立即要求平台级模块迁移。

### 1.2 约束

1. 类型信息不能只藏在 Schema annotations 里，必须有 TS 层可见的结构；
2. Generator/插件的解析成本要压到极低（SWC + 多级过滤 + 缓存）；
3. 生成物必须是**普通 TS 模块 / d.ts**，不引入特殊构建步骤才能运行。

---

## 2. 单一事实源：State 设计文件

### 2.1 设计文件形态（开发者视角）

约定一个“设计文件”层，不强制文件名，但强制写法形态：

```ts
// SandboxState.design.ts
import { Schema } from "effect"

export const SandboxStatusSchema = Schema.Union(
  Schema.Literal("idle"),
  Schema.Literal("running"),
  Schema.Literal("completed"),
  Schema.Literal("error"),
)

export const SandboxState = Schema.Struct({
  status: SandboxStatusSchema.annotations({
    "logix/autoReducer": { action: "setStatus", mode: "assign" },
  }),
  code: Schema.String.annotations({
    "logix/autoReducer": { action: "setCode", mode: "assign" },
  }),
  uiIntents: Schema.Array(Schema.Any).annotations({
    "logix/autoReducer": { action: "addUiIntent", mode: "push" },
  }),
  // ...
})
```

特征：

- **只出现 state / schema 定义**，不出现 `actions` / `reducers` / `Module.make`；
- 使用带命名空间的注解 key：`"logix/autoReducer"`，方便工具精确匹配；
- DSL 写法尽量简单，便于 AST 模式匹配（避免中间变量层层传递）。

### 2.2 Annotations 语义

`"logix/autoReducer"` 注解只做「蓝图」用途，不直接影响 effect/Schema 行为：

- `action: string`：该字段绑定的 Action Tag 名（默认可约定为 `set${PascalCase(field)}` 或 `add${...}`，但推荐显式写明）；
- `mode: "assign" | "push" | "concat" | "toggle" | ...`：Reducer 策略；
- 可选扩展字段：
  - `scope: "public" | "internal"`：用于未来 IR / DevTools 展示区分；
  - `event?: string`：与事件 Schema 对齐时使用（可不在第一版实现）。

注意：**annotations 只作为生成器的输入，不直接参与类型推导**。

---

## 3. 生成物：Module 实现 + 类型文件

### 3.1 运行时代码生成（`.generated.ts`）

Generator 对每个设计文件生成一个对应的 Module 实现，如：

```ts
// SandboxModule.generated.ts（由工具生成，禁止手动修改）
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { SandboxState, SandboxStatusSchema } from "./SandboxState.design"

const actions = {
  setStatus: SandboxStatusSchema,
  setCode: SandboxState.fields.code,
  addUiIntent: Schema.Any,
  // ...
} as const

export const SandboxModule = Logix.Module.make("SandboxModule", {
  state: SandboxState,
  actions,
  reducers: {
    setStatus: (state, action) => ({ ...state, status: action.payload }),
    setCode: (state, action) => ({ ...state, code: action.payload }),
    addUiIntent: (state, action) => ({
      ...state,
      uiIntents: [...state.uiIntents, action.payload],
    }),
    // 复杂 reducer（如 resetOutput）仍由业务手写或额外注解产生
  },
})
```

业务代码只需要：

```ts
import { SandboxModule } from "./SandboxModule.generated"
```

类型来源与现在完全一致：`actions` map 是显式对象，`ReducersFromMap` 提供类型约束，Runtime 不感知“这是生成出来的”。

### 3.2 类型声明生成（`.generated.d.ts`）

为保证 **IDE / tsc 在不参与构建插件时也能获得完整类型**，同一套生成逻辑应输出 `.d.ts`：

```ts
// SandboxModule.generated.d.ts（自动生成）
import * as Logix from "@logix/core"
import type { SandboxState } from "./SandboxState.design"

export declare const SandboxModule: Logix.ModuleInstance<
  "SandboxModule",
  Logix.Shape<typeof SandboxState, {
    setStatus: typeof SandboxState.fields.status
    setCode: typeof SandboxState.fields.code
    addUiIntent: import("effect").Schema.Schema<any, any, any>
  }>
>
```

这样：

- `dispatch` / `$.actions.*` / `ModuleHandle.actions.*` 的类型完全由生成物决定；
- 即使不启用 Vite 插件，裸跑 `tsc --noEmit` 也能给出完整类型检查。

---

## 4. 工具链与性能设计（SWC + Vite 插件）

### 4.1 多级过滤：尽量避免无谓解析

在 Vite 插件或独立 generator 中对文件做“漏斗式”处理：

1. **字符串预过滤（O(n)）**
   - 只在包含以下标记的文件上继续处理：
     - `"logix/autoReducer"`
     - `"Schema.Struct("`
   - 强约束 DSL：设计文件必须显式使用 `Schema.Struct({...})`，不透过中间变量。

2. **语法片段过滤（仍然无 AST）**
   - 双重条件：同时包含 `Schema.Struct` 与 `logix/autoReducer`；
   - 其它文件直接返回原代码。

3. **SWC AST 解析（仅对极少数文件）**
   - 一旦进入 AST 阶段，只关注两类节点：
     - `Schema.Struct({ ... })` 调用表达式；
     - `.annotations({ "logix/autoReducer": ... })` 调用；
   - 避免对整棵 AST 做复杂遍历，只匹配固定模式。

### 4.2 Transform 策略：局部替换或虚拟模块

两种实现路径（可并行尝试）：

1. **局部替换模式**
   - 约定业务写：
     ```ts
     export const SandboxModule = Logix.Module.auto("SandboxModule", {
       state: SandboxState,
     })
     ```
   - 插件识别 `Logix.Module.auto` 调用，将该 CallExpression 替换为生成的 `Logix.Module.make(...)` 代码；
   - 原文件其它部分不动，利于调试与 sourcemap。

2. **虚拟模块模式**
   - 插件在看到 `SandboxState` 设计文件时，注入：
     ```ts
     import { SandboxModule } from "virtual:logix-module/SandboxState"
     ```
   - 同时实现 `resolveId/load`，对 `virtual:logix-module/*` 返回生成的 Module 源码；
   - 这种方式利于缓存与多入口复用。

### 4.3 缓存：内容哈希 + 进程内缓存

为压缩生成成本：

- 对每个 `id` 维护 `{ hash, code }`；
- 在 transform 前先计算一个轻量 hash（例如 32-bit rolling hash）：
  - 如 hash 未变，直接复用上次生成的代码；
  - 仅当 hash 变化才重新 SWC parse + 生成；
- 与 Vite 自带的 HMR/缓存机制叠加，实际解析/生成的频率会非常低。

---

## 5. 类型安全策略与错误反馈

### 5.1 类型安全边界

1. **Dispatch / Actions 类型**  
   - 完全由生成的 `actions` map + `Logix.Shape` 推导；
   - Generator 必须保证：
     - 每个 `action` key 对应一个有效的 Schema；
     - Reducer 签名符合 `ReducersFromMap` 期望。

2. **State 与 Action Schema 一致性**
   - 默认规则：当注解指定 `action` 名且未显式 payload Schema 时，payload Schema = 字段 Schema；
   - Generator 在 dev 模式可做额外 sanity check，例如：
     - 若显式指定 payload Schema，与字段 Schema 不兼容时给出告警。

3. **Runtime 不再“猜类型”**
   - `@logix/core` 不依赖 annotations 来推断任何类型；
   - 所有类型信息都由生成物写死，Runtime 只执行纯 TS/JS 逻辑。

### 5.2 错误反馈原则

- **设计时优先报错**：  
  在 Generator 阶段发现以下问题时，应直接 fail 并给出清晰错误：
  - 注解中的 `action` 名未在生成的 actions 集合中出现；
  - mode 不支持；
  - 解析不到明确的 `Schema.Struct` 形态（开发者写法不符合 DSL）。

- **编译期兜底**：  
  即使 Generator 某处疏漏，生成物仍会经过 TS 编译：
  - 若 reducer 签名不符合 `ReducersFromMap`，会直接有 TS 报错；
  - 这比“Runtime 靠 if/throw 才发现问题”更安全。

---

## 6. 分阶段落地计划

### Phase 1：只做 Auto Reducer（无 codegen）

短期在 `@logix/core` 内部实现：

- 支持在 Module 定义时传入 `reducers`；
- 新增工具：`Logix.Module.Reducer.fromStateAnnotations(stateSchema, actions)`：
  - 遍历 State 字段上的 `"logix/autoReducer"` 注解；
  - 为每个字段生成 `(state, action) => state` reducer；
  - 与手写 reducers 合并（手写优先）。

**价值**：减样板、压缩 reducer 层重复代码，不动 action 类型来源，风险极低。

### Phase 2：独立 generator（CLI / Node API）

实现一个 `@logix/codegen` 包：

- 暴露：
  - `generateModules({ entries: string[] })`：从若干设计文件生成 `*.generated.ts` + `*.generated.d.ts`；
  - 可被脚本调用：`pnpm logix gen-modules`。
- 优先在 Sandbox / examples 中接入：
  - 例如 `examples/logix-sandbox-mvp` 的 `SandboxModule`；
  - 验证完整链路：State-only → Module + 类型。

### Phase 3：Vite 插件与 Dev 体验整合

- 将 generator 逻辑嵌入 Vite 插件：
  - dev 模式下，改 State 文件即可自动看到 Module 行为更新；
  - 支持虚拟模块或局部替换两种策略，视 DX/调试体验选择。
- 提供 VSCode 任务 / npm script：
  - `pnpm logix gen-modules --watch`：适配非 Vite 场景。

### Phase 4：与 Runtime / DevTools / Studio 对齐

- 将 `"logix/autoReducer"` 元数据暴露给 DevTools / Studio：
  - 展示“哪些字段有自动 reducer，对应的 Action 列表”；
  - 支持从 State 视角浏览 Action/Reducer；
- 在 `docs/specs/runtime-logix` / `intent-driven-ai-coding/v3` 中固化：
  - State-First Module 定义模式；
  - Codegen + Runtime 分层职责。

---

## 7. 待决问题 / 后续探索

1. **字段 → Action 命名约定的正式规范**  
   - 是否强制 `set${PascalCase(field)}` / `add${PascalCase(field)}`，还是允许完全自由命名（更灵活但解析更复杂）；
   - 是否为“列表型字段”引入特定 Mode（`append/removeById` 等）。

2. **复杂 Reducer 的表达方式**  
   - 是否允许在注解中引用命名 Reducer 函数（例如字符串引用 + 生成器 import）；
   - 还是保持“简单 reducer 走自动生成，复杂 reducer 仍然手写”的分界。

3. **与其他 Schema 能力（持久化/权限/埋点）的融合**  
   - 本草稿只谈 Action/Reducer；
   - 后续需要与 `topics/trait-system/00-overview.md` 对齐，避免出现第二套“行为事实源”（以 007 为裁决）。

4. **跨语言/多运行时的一致性**  
   - 如果未来有 Node/边缘侧 Logix Runtime，是否也消费同一套生成物；
   - Generator 是否需要支持多目标输出（例如 ESM + CJS 或多语言 IR）。

本草稿侧重确定 **State-First + Codegen** 的整体形态与分层职责，后续若进入实现阶段，应同步更新：

- `docs/specs/runtime-logix/core/02-module-and-logic-api.md`；
- `docs/specs/runtime-logix/impl/README.md`；
- `docs/specs/intent-driven-ai-coding/v3/03-assets-and-schemas.md` 中对 Module/Schema 的说明。
