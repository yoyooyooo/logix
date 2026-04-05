---
title: "30. Kernel ABI"
status: draft
version: 2025-12-29
value: vision
priority: next
---

# 30. Kernel ABI（JS Host ↔ WASM Kernel）

> 目标：定义一个“不会负优化”的最小 ABI：**一次 txnCommit 一次调用**，传输只允许整型/线性内存视图。

## ABI 原则

- 输入/输出都必须是 `Uint32Array/Uint8Array` 等线性内存视图；禁止对象，禁止字符串。
- off 下只输出最小锚点（instanceId/txnSeq/opSeq + stepId/pathId 等）；light/full 才能在边界 materialize mapping。
- ABI 必须与统一最小 IR 对齐：能完整重建 Dynamic Trace，不引入并行真相源。

## 建议的最小调用形态（草案）

> 仅描述形态，不代表最终签名。

- `init(staticTables: ArrayBuffer | memoryOffset)`
- `txnCommit(dirtyRootsU32: memoryOffset, len: number) -> { planPtr, planLen, tracePtr?, traceLen? }`

核心约束：`txnCommit` 的返回必须足够支撑 JS Host 在本地执行完本次事务（或在更高等级直接由 WASM 执行），不允许 per-step 回调。

补充约束（与“不负优化”证据对齐）：

- `txnCommit` 应能输出最小 counters（如边界传输 bytes、计划长度、内部扫描规模），用于解释收益曲线与边界税。
- `force-js/force-wasm` 必须保证 ABI 等价（同输入同输出形态），以支持可比的 before/after/diff。

## Memory Layout（待深化）

- Static tables：registry/topo/indices（只读；可 mmap/缓存）
- Dynamic buffers：dirtyRoots、plan、trace（可复用；避免每次分配）
