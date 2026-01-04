---
title: Intent Dev API (`$`) 与 LLM 注解层草案
status: draft
version: 2025-12-02
related: []
---

# Intent Dev API (`$$`) 与 LLM 注解层草案

## 背景

现状：

- 运行时主 DSL 已收敛为：
  - 源：`$.onState` / `$.onAction` / `$.on`；
  - 策略：`$.flow.fromState/fromAction` + `debounce` / `throttle` / `filter` / `run*`（主要给库与 Pattern 使用）；
  - 行动：`$.state.update/mutate` / `$.actions.dispatch`；
  - 为保证 Platform-Grade 子集可解析/可回写，运行时不再提供 `andThen` 这类“同名多语义”的 DX 糖；统一使用显式终端 `.update/.mutate/.run*`。
- Parser/平台使用的白盒子集仅包含 Fluent 规范形态：
  - `yield* $.onState(selector).op().update/mutate/run*(...)`
  - `yield* $.onAction(predicate).op().update/mutate/run*(...)`
  - `yield* $.on(streamExpr).op().run*(...)`

问题：

- Fluent 代码本身已经可以解析出一部分 IntentRule，但在“规划/画布/LLM Prompt/规范对齐”场景下，还缺少一个**只承载 IR/注解、不直接参与运行时执行**的层；
- 直觉上会产生类似 `$$.rule(...)` / `$$.prompt(...)` 的写法，供人和 LLM 写“意图声明”，但需要明确：
  - 它的定位 **不是** 第二套可执行 DSL；
  - 它如何被平台/工具消费；
  - 它如何在打包阶段被剔除，避免污染生产 bundle。

## 设计目标

1. 提供一个 **“Intent 注解层”**，专门给人类/LLM/工具书写：
   - IntentRule 级规则声明（`source/pipeline/sink`）；
   - Prompt/注释/设计意图等高语义信息。
2. 明确：这一层**不直接参与运行时执行**，最终能跑的仍是 Fluent/Pattern/Flow 组合。
3. 工程上可控：
   - dev/分析阶段可以完整读取 `$$.*` 注解；
   - prod 构建时可以通过常量 + Tree-Shaking 或 AST 插件，将 `$$.*` 调用从 bundle 中剔除。

## 核心提案：Intent Dev API (`$$`)

暂定在 Module 逻辑上下文中引入一个“开发期 Intent API”，形如：

```ts
AppCounterModule.logic(($, $$) =>
  Effect.gen(function* () {
    // 1. 运行时代码（Fluent + 显式终端）
    yield* $.onAction("increment").run(
      $.state.update((prev) => ({ ...prev, count: prev.count + 1 })),
    )
    yield* $.onAction("decrement").run(
      $.state.update((prev) => ({ ...prev, count: prev.count - 1 })),
    )

    // 2. 开发期 Intent 注解（IR + Prompt）
    if (__LOGIX_INTENT_DEV__) {
      $$.rule("counter/inc", {
        source: { type: "action", match: "increment" },
        sink: {
          type: "state",
          kind: "update",
          handler: (prev) => ({ ...prev, count: prev.count + 1 }),
        },
      })

      $$.rule("counter/dec", {
        source: { type: "action", match: "decrement" },
        sink: {
          type: "state",
          kind: "update",
          handler: (prev) => ({ ...prev, count: prev.count - 1 }),
        },
      })

      $$.prompt("counter/summary", {
        kind: "llm-note",
        text: "Counter 模块：inc/dec 两条规则，保持 count ∈ ℤ。",
      })
    }
  }),
)
```

### 2.1 `$$.rule`：IntentRule 级声明（IR Only）

语义定位：

- 只用于声明 **结构化 IntentRule IR**：
  - `id`: 规则标识；
  - `source`: `{ context, type, selector/match }`；
  - `pipeline`: Flow 算子链（可选）；
  - `sink`: `{ type: "state" | "dispatch" | "effect" | ...; handler?: Expr }`。
- 可以由平台/工具直接消费，无需执行代码即可构建 Intent 图。

消费方式（概念草案）：

1. **平台/Parser**：在扫描 Logic 文件时，同时读取：
   - 白盒 Fluent 规则 → 还原为 IntentRule；
   - `$$.rule(...)` → 直接读取 IR 结构；
   最终在 Universe/Galaxy 视图中合并为一套规则集合，标记“来自代码”或“来自注解”。
2. **代码生成/回写**：
   - 工具可以根据 `$$.rule` 反向生成或校准 Fluent 代码骨架：
     - e.g. 识别 `source/sink`，生成 `yield* $.onAction(...).update(...)` 代码；
   - 这样可以支持“先改 IR，再同步改代码”的半自动流程。

运行时：

- prod 构建中，这些 IR 注解不会直接参与执行；
- 如需执行，必须通过单独的编译过程生成 Fluent/Pattern，再由 Logic 承载。

### 2.2 `$$.prompt`：LLM/工具消费的高语义注释

语义定位：

- 用于存放给 LLM / 工具阅读的“高语义注释”：Prompt 片段、非结构化解释、约束说明等；
- 不要求有固定结构，只要求有基本字段：
  - `id` / `scope`：关联到 Module / 规则 / 视图节点；
  - `kind`: `"llm-note" | "doc-snippet" | ...`；
  - `text`: 文本内容。

消费方式：

- LLM/工具在构造 Prompt 或生成变更建议时，可以优先读取 `$$.prompt`：
  - 为某个规则提供额外上下文；
  - 解释设计约束，而不是从代码 AST 中硬猜。

构建时同样通过工程化手段剔除，不进入生产 bundle。

## 3. 工程约束：避免增大 bundle 体积

本草案建议从一开始就把 Intent Dev API 设计为 **“dev-only 注解层”**，通过以下方式避免污染生产构建。

### 3.1 编译期常量 + Tree-Shaking（首选）

约定一个编译期常量，例如：

```ts
declare const __LOGIX_INTENT_DEV__: boolean
```

所有 `$$` 调用都必须包裹在该常量分支内：

```ts
if (__LOGIX_INTENT_DEV__) {
  $$.rule(...)
  $$.prompt(...)
}
```

在构建配置中：

```js
// 伪代码（Vite/Rollup/esbuild）
define: {
  __LOGIX_INTENT_DEV__: 'false',
}
```

在生产构建中，打包器会将整个 `if (false) { ... }` 分支和 `$$.*` 调用一并裁剪掉：

- dev/分析场景：工具直接从源码 AST 读取完整的 `$$.rule/$$.prompt`；
- prod：bundle 中不包含这些注解逻辑。

### 3.2 dev/prod 双实现（可选补充）

可选地，将 Intent Dev API 拆成类型 + dev/prod 实现：

```ts
export interface IntentDevApi {
  rule(...): void
  prompt(...): void
}

// dev 版本：真实记录元数据
export const DevIntent: IntentDevApi = { ... }

// prod 版本：空实现
export const NoopIntent: IntentDevApi = {
  rule() {},
  prompt() {},
}
```

构建时通过 alias 切换：

- dev：`import { DevIntent as $$ } from "@logix/core/intent-dev"`；
- prod：alias 到 `NoopIntent`，配合 `__LOGIX_INTENT_DEV__` 常量及 Tree-Shaking，最终不会保留任何实际调用。

### 3.3 AST 插件/Codemod（高级选项）

如果后续需要更细粒度控制，可以补充一个轻量 AST 插件（Babel/TS）或 Codemod：

- 在生产构建前统一移除所有 `$$.rule/$$.prompt/...` 调用；
- 或将它们替换为注释/元信息片段，供后续审计使用。

本草案暂不强制这一项，仅记录为后续工程方案的选项。

## 4. 边界与后续工作

1. **运行时职责边界**  
   - 能跑的逻辑仍然交给 Fluent DSL / Flow / Pattern；  
   - `$$` 不直接执行，最多作为“IR → Fluent”编译过程的输入。
2. **白盒/黑盒边界**  
   - Parser 的白盒子集仍定义在 `$` 上，不会因为引入 `$$` 而扩展；  
   - 所有 `$$.*` 调用在 IR 层直接视为 IR/注解来源，无需执行代码。
3. **后续规范化工作**  
   - 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/platform/06-platform-integration.md` 中补充“Intent Dev API/注解层”的角色描述；  
   - 在 `v3/platform/impl/intent-rule-and-codegen.md` 中定义 `$$.rule` 产生的 IR 形状及与 Fluent 解析结果的合并策略；  
   - 按本草案设计一个最小可用的 `IntentDevApi` 类型与 dev-only 实现，后续视真实场景演进。
