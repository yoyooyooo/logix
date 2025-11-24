# Logix Builder SDK Design (@logix/builder)

> **Status**: Final Draft (v3 - Static Analysis Paradigm)
> **Purpose**: 为 Logix 平台提供一套强类型的 DSL 契约与 Pattern 定义工具。它是连接“业务代码”与“平台资产”的桥梁，支持通过静态分析实现全双工意图显影。

## 1. 核心定位：静态分析契约 (Static Analysis Contract)

在 v3 架构中，Builder SDK 不再是一个“运行时录制器 (Runtime Recorder)”，而是一套 **DSL 语义标准**。

*   **Code is Truth**: 开发者编写的标准 TypeScript 代码是唯一的事实源。
*   **Parser is Viewer**: 平台不执行代码来获取结构，而是通过 **Static Analysis (Parser)** 读取源码中的 DSL 调用，构建可视化视图 (AST)。
*   **Unified API**: Builder 环境与 Runtime 环境共享同一套 DSL 接口 (`LogicDSL`)，实现真正的同构。

## 2. 核心 API

### 2.1 `LogicDSL` (The Abstract Interface)

这是所有业务逻辑的基础契约。它定义了平台能够“看懂”的原子操作。

```typescript
import { Context, Effect } from "effect";

export interface LogicDSL {
  // 1. 状态操作 (State Ops)
  // Parser 识别为: UpdateState Node
  set: <T>(path: string | Ref<T>, value: T) => Effect.Effect<void>;
  
  // 2. 服务调用 (Service Ops)
  // Parser 识别为: ServiceCall Node
  call: <T>(service: string, method: string, args: any) => Effect.Effect<T>;
  
  // 3. 流程控制 (Flow Ops)
  // Parser 识别为: Branch Node
  branch: (condition: boolean, thenEff: Effect.Effect<void>, elseEff: Effect.Effect<void>) => Effect.Effect<void>;
  
  // 4. 信号与事件 (Signal Ops)
  // Parser 识别为: Emit Node
  emit: (signal: string, payload?: any) => Effect.Effect<void>;
}

export const LogicDSL = Context.Tag<LogicDSL>("@logix/LogicDSL");
```

### 2.2 `definePattern` (The Asset Wrapper)

这是将普通函数转化为“平台资产”的包装器。它为 Parser 提供了明确的识别靶子。

```typescript
import { Schema } from "@effect/schema";

export function definePattern<C>(def: {
  id: string;          // 资产唯一标识
  version: string;     // 语义化版本
  icon?: string;       // 画布图标
  tags?: string[];     // 搜索标签
  config: Schema<C>;   // 配置契约 (用于生成 Wizard 表单)
  body: (config: C) => Effect.Effect<void, any, LogicDSL>; // 逻辑生成器
}): Pattern<C> { ... }
```

## 3. 编写范式 (Coding Paradigms)

### 3.1 基础逻辑 (The Basic Flow)

开发者使用 `Effect.gen` 配合 `LogicDSL` 编写逻辑。

```typescript
import { Effect } from "effect";
import { LogicDSL } from "@logix/dsl";

export const submitOrder = Effect.gen(function* (_) {
  const dsl = yield* _(LogicDSL);

  // 1. 设置 Loading (白盒节点)
  yield* dsl.set("ui.isSubmitting", true);

  // 2. 调用服务 (白盒节点)
  const result = yield* dsl.call("OrderService", "create", { amount: 100 });

  // 3. 分支处理 (白盒节点)
  yield* dsl.branch(
    result.success,
    dsl.emit("toast", "Success"),
    dsl.emit("toast", "Failed")
  );
});
```

### 3.2 混合写法 (Hybrid Coding)

平台允许在 DSL 中混入原生 Effect 代码。Parser 会根据代码特征进行降级处理。

```typescript
export const complexFlow = Effect.gen(function* (_) {
  const dsl = yield* _(LogicDSL);

  // [White Box] 平台完全理解
  yield* dsl.call("Api", "fetchData");

  // [Black Box] 平台识别为 "Raw Code Block"
  // 这是一个复杂的原生逻辑，平台不尝试解析其内部结构，只显示为代码块
  const processedData = yield* Effect.promise(async () => {
    const raw = await fetch('/legacy-api');
    return complexMath(await raw.json());
  });

  // [White Box] 继续可视化
  yield* dsl.call("Api", "saveData", processedData);
});
```

## 4. 静态分析原理 (How Parser Works)

Parser 不执行代码，而是遍历 TypeScript AST：

1.  **Import Analysis**: 识别 `LogicDSL` 的引入和重命名。
2.  **Context Tracking**: 追踪 `yield* _(LogicDSL)` 获取的实例变量名 (通常是 `dsl` 或 `api`)。
3.  **Call Expression Matching**: 
    *   匹配 `dsl.call(...)` -> 生成 `ServiceNode`。
    *   匹配 `dsl.branch(...)` -> 生成 `BranchNode`。
    *   匹配 `definePattern(...)` -> 提取元数据和 Config Schema。
4.  **Fallback Strategy**:
    *   遇到无法识别的语句 (如 `console.log`, `native fetch`) -> 归并为 `RawCodeNode`。
    *   遇到动态参数 (如 `dsl.call(variable)`) -> 标记为 `GrayBox` (Ejected Node)。

## 5. 优势

1.  **Zero Runtime Overhead**: 生产环境直接运行编译后的 JS 代码，无额外的录制/回放开销。
2.  **Full TypeScript Support**: 开发者可以使用完整的 TS 能力 (类型检查、重构、跳转)。
3.  **Graceful Degradation**: 即使代码写得再乱，平台也能至少显示为“代码块”，而不会崩溃或报错。
