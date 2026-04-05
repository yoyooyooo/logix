---
title: Logix NG - Wasm Planner Exploration
status: draft
layer: Runtime
related:
  - specs/013-auto-converge-planner/spec.md
  - specs/009-txn-patch-dirtyset/spec.md
  - specs/039-trait-converge-int-exec-evidence/spec.md
---

# Draft: Wasm Acceleration Opportunities in Logix Runtime

> **Topic**: `wasm-acceleration`
> **Level**: L1（Exploration）
> **Related Specs**: `specs/013-auto-converge-planner/`, `specs/009-txn-patch-dirtyset/`
>
> **Context**: 作为 JS 单线程运行时，Logix 在处理超大规模依赖图（万级节点+）的实时派生决策时，面临内存寻址与 GC 的物理瓶颈。本草稿探讨引入 Wasm (Rust) 作为“Static IR Kernel”的可能性与落地场景。

## 0. 对齐与边界（先防负优化）

- **事务窗口禁 IO/async**：Wasm 调用本身是同步计算没问题；一旦变成 Worker/off-main-thread 的异步往返，就会改变“单窗口内 0/1 commit”的语义与证据解释链路，需要另立 spec，而不是“顺带引入”。
- **Static IR 驻留 + Integer Bridge**：只有满足“静态数据驻留、整数交换、buffer 复用”的场景才可能是纯赚；任何字符串/对象跨边界都属于高风险负优化源。
- **证据门槛**：必须以 `$logix-perf-evidence` 在 Node + Browser 给出可复现证据；Node V8 证据不是充分条件（Browser JIT/GC 行为可能不同）。
- **优先级**：优先把 `specs/039-trait-converge-int-exec-evidence/` 的纯 JS 整型/TypedArray 路线做到极致；仅当证据显示仍被 GC/Map/Set 主导时再考虑 Wasm。

## 1. 核心假设 (The Core Hypothesis)

当 Logix 演进到 `specs/013-auto-converge-planner/` 阶段时，Runtime 需要在高频事务窗口（<16ms）中执行复杂的图算法（Reachability Analysis）。

JS 在此类任务上的先天劣势：

- **Pointer Chasing**: 对象引用的图遍历导致 Cache Miss。
- **GC Pressure**: 临时数据结构（Set/Queue）触发 GC 抖动。
- **Bitwise Limits**: 缺乏原生的宽位 SIMD 支持（虽然有 BigInt/TypedArray 但操作昂贵）。

**Wasm 核心价值**：不在于计算逻辑本身快多少，而在于 **数据结构的内存布局（Memory Layout）** 与 **零 GC（Zero-GC）** 特性。

---

## 2. 候选场景 (High ROI Candidates)

并非所有逻辑都适合 Wasm。通信成本（Boundary Crossing）是最大的负优化源。只有满足 **"Data Resident, Integer Exchange"** 的场景才值得投入。

### 2.1 The Wasm Planner (Static IR Kernel)

最有可能落地的场景。将 `Auto Converge` 的决策引擎下沉。

- **输入 (Init)**:
  - 应用启动时，一次性将全量 **Static IR (Dependency Graph)** 序列化传入 Wasm 线性内存。
  - Wasm 内部构建 Compact Adjacency List 或 Bitset Matrix。
- **运行时交互 (Runtime Txn)**:
  - JS 发送：`DirtyNodeIds: Int32Array` (例如 `[1, 42, 99]`)。
  - Wasm 计算：在私有内存中跑传递闭包（Transitive Closure），无 GC，无对象分配。
  - Wasm 返回：`ExecutionPlan: Int32Array` (例如 `[1, 5, 8, 42...]` 拓扑序)。
- **收益**: 将 O(N) 的 JS 对象遍历优化为接近 O(1) 的内存位运算。

### 2.2 Complex Pattern Compiler

针对 `Logix Pattern Matching` 的复杂查询（如果未来支持类似 SQL/GraphQL 的复杂筛选）。

- **机制**: 将复杂的 Pattern（如 `A && (B || C) && !D`）在构建时编译为 Wasm 字节码或闭包。
- **运行时**: 数据流过时，直接调用 Wasm 函数进行判定。
- **优势**: SIMD 加速的批量匹配（Batch Matching）。

### 2.3 Structural Identity Hashing

针对 `009` 和 `001` 中的 Deep Identity 生成。

- **场景**: 为巨大的嵌套对象/不可变数据生成唯一 Content Hash。
- **优势**: Rust 的 `xxHash` 或其他非加密 Hash 算法通常比 JS 实现快得多，且可以直接操作 Buffer。

---

## 3. 实施架构：Residency & Integer Bridge

为了避免“为了做而做”，必须遵守严格的架构约束：

```mermaid
graph TD
    subgraph JS Main Realm
        Store[Logix Store]
        Dirty[Dirty Set Tracker]
        Executor[Pipeline Executor]
    end

    subgraph Wasm Linear Memory (Shared/Copy)
        StaticGraph[Compact Static Graph (Resident)]
        PlanBuffer[Pre-allocated Queue/Set]
    end

    Store -- 1. Initialize (Once) --> StaticGraph
    Dirty -- 2. Dirty IDs (Int32Array) --> StaticGraph
    StaticGraph -- 3. Compute Reachability (Rust/SIMD) --> PlanBuffer
    PlanBuffer -- 4. Plan IDs (Int32Array) --> Executor
```

### 关键原则

1.  **Static Data Resident**: 图结构永远不通过 Bridge 传输，它像纹理一样上传到 GPU 后就驻留。
2.  **Buffers Reused**: 避免每次调用分配新的 TypedArray，使用 SharedArrayBuffer 或复用内存段。
3.  **No Strings Attached**: 严禁在热路径上传递字符串。所有 Node 必须在 JS 侧映射为 Integer ID。

---

## 4. 决策门槛 (Optimization Cut-off)

何时启动该项目？

1.  **Profiling Evidence**:
    - 在 `013` 的 Auto 模式压测中，`Planner.decide` 耗时稳定超过 **1ms**。
    - 且主要耗时为 `GC` (Minor GC) 或 `Map.get / Set.add`。
2.  **Scale Threshold**:
    - 图节点数 > 1,000 或 依赖密度（Edge/Node Ratio） > 10。

若未达到上述门槛，JS `TypedArray` 模拟的图算法通常足够快，引入 Wasm 反而是负优化（因通信开销）。

---

## 5. 下一步探索

- [ ] **Benchmark**: 构建一个纯 JS (Int32Array based) 的 Reachability Demo，测算 10k 节点的极限 TPS。
- [ ] **Prototype**: 用 Rust/wasm-bindgen 写一个最小同构版，对比 Round-trip 开销。
