# Logix Builder SDK Design (@logix/builder)

> **Status**: Final Draft (v3 - Static Analysis Paradigm)  
> **Purpose**: 为 Logix 平台提供一套强类型的 DSL 契约与 pattern-style 长逻辑封装工具。它是连接“业务代码”与“平台资产”的桥梁，支持通过静态分析实现全双工意图显影。  
> **Note**: 本文基于 **Store / Logic / Flow / Control / Effect.Service / Config** 等运行时原语展开描述。Builder 被视为围绕这些原语的“工具链投影”，只负责**解析 / 生成**使用它们的代码本身，而不提供第二套运行时。

## 1. 核心定位：静态分析契约 (Static Analysis Contract)

在 v3 架构中，Builder SDK 被定义为一套 **DSL 语义标准**。

*   **Code is Truth**: 开发者编写的标准 TypeScript 代码是唯一的事实源。
*   **Parser is Viewer**: 平台不执行代码来获取结构，而是通过 **Static Analysis (Parser)** 读取源码中的 DSL 调用，构建可视化视图 (AST)。
*   **Unified Language**: Runtime 与 Builder 以同一套基于 Store / Logic / Flow / Control 的 Effect-Native API 作为“语言”。Builder 只依赖这些 API 的类型与调用约定进行解析和代码生成，而不复刻一套独立 DSL。

## 2. 目标语言（Builder 视图）

Builder SDK 不定义一整套独立的 `LogicDSL` 类型，而是围绕 Runtime Core 的原语提供更易分析的写法规范；换言之，**Builder 面向的“语言”就是 `@logix/core` 暴露的 Store / Logic / Flow / Control API 本身**：

- 对状态：通过 `Logic.Api.state`（`read / update / mutate / ref`）操作 Store；  
- 对 Flow：统一使用 `flow.*` 算子构建触发源与时序输出；  
- 对 Control：使用 `control.*` 明确表达分支与错误边界；  
- 对 Service / Config：使用 `Effect.Service` + Layer / Config 读取约定。

### 2.1 pattern-style 长逻辑封装

Builder 视角下的“一等产物”是 pattern-style 的 **长逻辑函数**：对外暴露形如 `(input) => Effect` 的程序，内部实现仍旧完全基于 Runtime Core 的原语。

```ts
import { Effect } from "effect";

// 典型的 pattern-style 长逻辑：对外暴露 (input) => Effect 程序
export const runReliableSubmit = (input: {
  data: SubmitData;
  retryTimes: number;
}) =>
  Effect.gen(function* (_) {
    // 此处可以调用 Domain Service / 其它 pattern，
    // 也可以在调用侧由 Logic.make 注入 state / flow / control 等能力。
    // Builder 只约定：返回值是一个 Effect 程序，便于平台将其视为可资产化的长逻辑块。
  });
```

平台可以选择性地将某些 pattern-style 函数包装为 PatternAsset（带 id/version/configSchema 等），Runtime Core 仍然只认 `(input) => Effect` 本身；PatternAsset 只存在于平台 / Intent 层。

## 3. 编写范式 (Coding Paradigms)

### 3.1 基础逻辑 (The Basic Flow)

开发者使用 `Effect.gen` 配合 Runtime Core 提供的 `Logic.Api` 编写逻辑：

```typescript
import { Effect } from "effect";
import { Logic } from "@logix/core";

export const submitOrder = Logic.make<OrderShape, OrderEnv>(
  ({ state, flow, control }) =>
    Effect.gen(function* (_) {
      const submit$ = flow.fromAction(
        (a): a is { type: "submit" } => a.type === "submit",
      );

      const handleSubmit = control.tryCatch({
        try: Effect.gen(function* (_) {
          yield* state.update(prev => ({ ...prev, isSubmitting: true }));
          // 调用 Service / 处理结果 ...
        }),
        catch: err =>
          state.update(prev => ({ ...prev, errorMessage: err.message })),
      });

      yield* submit$.pipe(flow.runExhaust(handleSubmit));
    }),
);
```

### 3.2 混合写法 (Hybrid Coding)

平台允许在 Logic 中混入原生 Effect 代码。Parser 会根据代码特征进行降级处理。

```typescript
export const complexFlow = Logic.make<Shape, Env>(({ state, flow }) =>
  Effect.gen(function* (_) {
    // [White Box] 平台完全理解
    const data$ = flow.fromChanges(s => s.filters);

    // [Black Box] 平台识别为 "Raw Code Block"
    const processed = yield* Effect.promise(async () => {
      const raw = await fetch('/legacy-api');
      return complexMath(await raw.json());
    });

    // [White Box] 继续可视化
    // ...
  }),
);
```

## 4. 静态分析原理 (How Parser Works)

Parser 不执行代码，而是遍历 TypeScript AST：

1.  **Import Analysis**: 识别 `Logic` / `Store` / pattern helper / pattern-style 函数的引入和重命名。  
2.  **Context Tracking**: 追踪 `Logic.make` / `Logic.Fx` 生成的 Logic 程序，以及 `Logic.Api` 解构出的 `state/actions/flow/control`。  
3.  **Call Expression Matching**: 
    *   匹配 `flow.fromAction / fromChanges / debounce / throttle / run*` -> 构建 Flow 层节点。  
    *   匹配 `control.branch / tryCatch / parallel` -> 构建结构化控制流节点。  
    *   匹配 pattern-style 长逻辑 (`runXxxEffect`) 的导出 / 调用位置 -> 构建 `effect-block` 节点，并结合 PatternAsset（如有）附加资产信息。  
4.  **Fallback Strategy**:
    *   遇到无法识别的语句 (如 `console.log`, `native fetch`) -> 归并为 `RawCodeNode`。
    *   遇到动态参数 (如 `control.branch({ if: someVar, ... })`) -> 标记为 `GrayBox` (Ejected Node)。

## 5. 优势

1.  **Zero Runtime Overhead**: 生产环境直接运行编译后的 JS 代码，无额外的录制/回放开销。  
2.  **Full TypeScript Support**: 开发者可以使用完整的 TS 能力 (类型检查、重构、跳转)。  
3.  **Graceful Degradation**: 即使代码写得再乱，平台也能至少显示为“代码块”，而不会崩溃或报错。  
4.  **Runtime/Core 解耦 PatternAsset**: Pattern 资产只是对 `(input) => Effect` 的包装，Runtime-Core 不感知 id/version/configSchema 等元信息，便于演进。

## 6. 职责边界（Core / Builder / Runtime）

为避免“第二套 DSL”与职责混淆，v3 约定如下边界：

- `@logix/core`（Runtime Core）  
  - 定义 Store / Logic / Flow / Control 等运行时原语以及 `Logic.Api` 合同。  
  - 只关心“如何编写 / 如何执行” Logic 程序，不内建任何 AST 解析或 PatternAsset 概念。

- `@logix/builder`（Builder / Toolchain）  
  - 将 `@logix/core` 的 API 视为目标语言，负责静态分析（AST）和代码生成。  
  - 提供用于产出 pattern-style `(input) => Effect` 函数、PatternAsset skeleton、场景脚手架的工具。  
  - 本身不参与应用运行时，不提供第二套 Flow/Logic 运行时实现。

- 应用 Runtime / Studio  
  - 业务代码与线上运行时仅依赖 `@logix/core`。  
  - Studio / CLI / 编译器等平台组件在构建阶段依赖 `@logix/builder`，用以“看懂”和“产出” Logix 代码。
