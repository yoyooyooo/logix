---
title: Logix NG - Compiler-Driven Runtime (AOT)
status: draft
layer: Runtime
related:
  - docs/specs/drafts/topics/ai-native-ui/30-compilation-toolchain.md
  - docs/ssot/platform/contracts/00-execution-model.md
  - specs/039-trait-converge-int-exec-evidence/spec.md
---

# Logix NG: Compiler-Driven Runtime (AOT)

> "The fastest code is the code that doesn't exist at runtime."
>
> **Status**：IDEA（Exploratory）

本草案探讨利用 **Build-time Tooling (Vite/Rollup Plugins)** 对 Logix 逻辑进行 AOT (Ahead-of-Time) 编译优化，以达成极致的运行时性能。

## 0. 对齐：统一最小 IR 与可解释性锚点

- **AOT 不是第二套语义**：编译产物必须仍然能落到统一最小 IR（Static IR + Dynamic Trace）与既有诊断协议里；Devtools/Sandbox 不应“只在编译模式可用”。
- **稳定标识不被 inlining 破坏**：即使做 aggressive inlining，也必须保留稳定 `instanceId/txnSeq/opSeq`（以及 trait/step/path 的稳定 id）以支持解释、回放与 perf diff。
- **降级必须可证据化**：任何 deopt/fallback 都需要有明确边界与证据（避免编译器“聪明反被聪明误”引入负优化）。

## 1. 核心理念：AOT Optimization

在当前 `@logixjs/*` 运行时中，我们为了获得灵活性，在运行时做了大量“解释”工作：

- Runtime Parsing: `getAtPath(state, "user.profile.name")` 解析字符串路径。
- Runtime Dependency Collection: `Proxy` 拦截 getter。
- Runtime Graph Construction: 动态构建依赖图。

**NG 愿景**：
利用 **Vite Plugin / Macro**，在构建阶段将声明式的 Logic/Spec 转换为 **Monomorphic Optimized JS**。

## 2. 编译场景 (Compiler Targets)

### 2.1 Static Schema Accessors

- **Source**: `$.on(User.name)`
- **Compile Target**:
  ```javascript
  // Instead of: state.get("User.name")
  // Generated: state_view.getInt32(SCHEMA_OFFSETS.USER_NAME)
  ```
- **收益**: 完全消除 String Manipulation 和 Hash Lookup，接近 C 结构体访问速度。

### 2.2 Dependency Pre-calculation

- **Source**:
  ```typescript
  const fullName = $.derive((s) => s.firstName + " " + s.lastName);
  ```
- **Compile Target**:
  编译器静态分析 AST，发现 `fullName` 依赖 `firstName` 和 `lastName`。
  生成的运行时代码直接包含 `deps: [ID_FIRST, ID_LAST]`，无需运行时通过 `Proxy` 试跑一次来收集依赖。
- **收益**: 消除首次运行的 Overhead，同时也消除了 Proxy 的开销。

### 2.3 Topological Inlining

- **Source**: 一组相互依赖的 Trait。
- **Compile Target**:
  编译器直接计算出这些 Trait 的**静态执行顺序 (Instruction Sequence)**，并内联到一个大的 `while` 循环或函数中。
- **收益**: 消除运行时的图遍历和调度器开销。

## 3. 实现形态：The Logix Vite Plugin

```typescript
// vite.config.ts
import { logixCompiler } from "@logixjs/compiler";

export default defineConfig({
  plugins: [
    logixCompiler({
      // Schema 解析与 Offset 生成
      schema: "./src/schema",
      // 开启 AOT 优化
      aot: {
        accessors: true,
        deps: true,
        inlining: "aggressive",
      },
    }),
  ],
});
```

## 4. 挑战与约束

1.  **Dynamic Logix**: 并不是所有逻辑都能静态分析。对于动态生成的 Path 或依赖，运行时必须能够回退到 (Deopt) 解释模式。
2.  **Source Maps**: 激进的编译（如 Inlining）会破坏调试体验，需要高质量的 Source Map 支持。
3.  **HMR**: 开发模式下可能需要关闭 AOT 以支持快速热更。
4.  **证据门槛**：AOT 的收益很容易被宿主差异（Node vs Browser 的 JIT/GC）与桥接成本抵消，必须以 `$logix-perf-evidence` 的 Browser + Node 证据为门槛再推进。

## 5. 结论

通过引入 Compiler Layer，我们可以保持 DX (写起来像 TypeScript 对象) 的同时，获得接近手写 Low-level 代码的性能。这是连接 "High-Level Intent" 与 "Bare Metal Performance" 的关键桥梁。
