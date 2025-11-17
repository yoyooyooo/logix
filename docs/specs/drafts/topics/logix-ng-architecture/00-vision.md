---
title: Logix NG Vision - Database Internals & Compiled Reactivity
status: draft
layer: Runtime
related:
  - docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md
  - specs/039-trait-converge-int-exec-evidence/spec.md
  - specs/043-trait-converge-time-slicing/spec.md
  - specs/044-trait-converge-diagnostics-sampling/spec.md
---

# Logix NG: 数据库内核化 + 编译型响应式

> "如果我们像造数据库内核一样造 UI 状态引擎，会发生什么？"
>
> **Status**：VISION（Exploratory）

本草案通过 **数据库内核化 (Database Internals)** 与 **编译型响应式 (Compiled Reactivity)** 两个维度，阐述 **Logix NG** (Next Generation) 的架构愿景，旨在实现极致扩缩、可预测性与“意图驱动”的正确性。

## 0. 对齐：统一最小 IR（Static IR + Dynamic Trace）

本文使用 `OpCode / Bytecode / Instruction Stream` 作为类比，但在本仓裁决口径里，它们必须能完全降解到“统一最小 IR”：

- **Static IR**：可序列化、可回放、可 diff 的工件（例如 Planner/Converge 的静态图、执行计划、预编译访问器表等）。
- **Dynamic Trace**：运行时产生的 Slim 事件序列，统一稳定 `instanceId/txnSeq/opSeq`（以及 pathId/stepId 等）以支撑 Devtools 的可解释链路。
- **约束**：禁止新增第二套“字节码协议/证据协议”与 Devtools/Sandbox 并行演进；任何新概念必须回写到 SSoT 并以 feature spec 交付。

## 1. 核心哲学：线性指令流 (The Linear Instruction Stream)

**当前痛点**：
当前 `@logix/*` 运行时（当前内核）严重依赖动态依赖追踪 (`Proxy`)、运行时图拓扑排序以及大量的 JavaScript 对象分配来进行状态变更。虽然灵活性极高，但在大规模场景下不仅 GC 压力巨大，还容易因形态多变导致 V8 Deopt，字符串操作开销也不容忽视。

**Logix NG 愿景**：
将复杂的“图计算”从 **运行时 (Runtime)** 移至 **构建时 (Build-time)**。
引擎在运行时应执行 **线性、静态的指令流**，而非遍历动态图。

- **输入**：Intent Spec / Logic / Schema
- **构建**：静态分析与编译 -> `OpCode` / `Bytecode`
- **运行**：`while (instruction = next()) { execute(instruction) }`

## 2. 内存模型：扁平化类型舞台 (Flat Typed Arena - WASM Ready)

**当前痛点**：
状态以 V8 对象树的形式散落在堆中。

- **GC**：临时对象（Patches, Events, Closures）造成巨大的回收压力。
- **快照**：深拷贝或结构共享（Structural Sharing）带来昂贵的 CPU/内存开销。
- **局部性**：指针追踪（Pointer Chasing）导致 CPU 缓存命中率低下。

**Logix NG 愿景**：
采用 **数据导向设计 (Data-Oriented Design, DOD)**。

- **Schema 先行**：内存布局（Layout）在编译期由 Schema 确定。
- **扁平内存**：状态存储在 `SharedArrayBuffer` / `DataView` 或 TypedArrays 中。
  - _Struct of Arrays (SoA)_：列表数据列式存储，支持 SIMD 加速与高效扫描。
  - _Integer Handles_：所有的引用（RowID, FieldID）均为 `u32` 索引，彻底消灭指针与字符串。
- **零拷贝快照**：时间旅行（Time Travel）等价于一次 Arena 的 `memcpy`。
- **WASM 兼容**：这种布局天然兼容 WASM 线性内存，未来无需跨界序列化即可直接下沉计算内核。

## 3. 计算模型：AOT 优化的 JS > Bridge Tax

**为什么不直接上纯 WASM？**

- **过桥税 (Bridge Tax)**：JS <-> WASM 边界（尤其是涉及 DOM/React 交互时）的开销往往会抵消 UI 高频更新带来的计算收益。
- **开发体验 (DX)**：调试 WASM Panic 或内存损坏远比调试 JS 困难，违背“可解释性”初衷。

**策略："JS Head, Flat Body"**

- **编译器 (Compiler)**：生成高度优化的、单态 (Monomorphic) 的 JavaScript 代码 (AOT)。
  - 与其生成 `getAtPath(obj, "a.b.c")`，不如直接生成 `view.getInt32(OFFSET_A_B_C)`。
- **零分配变更 (Zero-Allocation Mutations)**：所有的写入操作本质上是对 Arena 的原地更新（或页级 Copy-on-Write），热路径上完全不进行 V8 Heap 分配。

## 4. 执行模型：确定性复制状态机 (Deterministic Replicated State Machine)

- **Log 驱动**：核心引擎是一个纯粹的、由 Event Log 驱动的状态机。
- **确定性回放**：任意状态均可通过重放 Log（配合快照）精准复原。
- **IO 隔离**：所有的副作用（网络、定时器）均在内核之外执行，仅通过严格的 Event 与内核通信。

## 5. 演进路径 (Incremental Path)

虽然无法一夜之间重写引擎，但 Logix NG 的愿景可以指引当前的优化方向：

1.  **Kernel Contract + 双内核跑道（分支点）**：以 `specs/045-dual-kernel-contract/` 固化“可替换内核契约 + 证据分档 + 对照验证 harness”，让未来的 NG 重写可以并行推进且风险可拦截（默认路径热循环保持零分支/零分配变化，且必须有 `$logix-perf-evidence` 的 Node+Browser 证据门禁）。
2.  **整型执行链路（当前内核落地锚点）**：以 `specs/039-trait-converge-int-exec-evidence/` 打通“从源头到执行”的整型链路（禁止字符串往返），并通过 `$logix-perf-evidence` 给出 Node + Browser 的可复现证据。
3.  **热路径零分配（当前内核落地锚点）**：在收敛/事务热循环中消灭临时对象（例如 patch 记录、plan typedarray 复用、诊断 off 零分配），确保“纯赚”且可证据化。
4.  **预算/熔断实现细化（当前内核落地锚点）**：预算检查必须保持低成本（必要时采样化），并在超预算时走明确的降级/回退语义，避免卡死宿主。
5.  **Time-slicing（显式改变语义）**：`specs/043-trait-converge-time-slicing/` 作为 opt-in 模式探索“跨帧/降频收敛”，不应混入“纯优化不改语义”的链路。
6.  **Diagnostics sampling（引入新观测口径）**：`specs/044-trait-converge-diagnostics-sampling/` 独立探索“抽样计时/观测”，避免污染 039 的证据与解释链路。
7.  **Schema-Driven Optimizations（待定）**：利用静态 Schema 分析绕过运行时防御性检查；需要明确对外语义与证据门槛后再立 spec。
8.  **Flat Store PoC（待定）**：针对重型 `List`/图结构状态试点 TypedArray/Arena 后端；必须以 Browser 端证据驱动，避免“工程上很酷但宿主里负优化”。

---

**状态**：草案 / 愿景（VISION）
**目标**：指引当前内核的极致性能优化方向（以证据驱动与 SSoT 对齐为前提）。
