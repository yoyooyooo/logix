---
title: 优化机会条目索引
status: active
updatedAt: 2026-02-27
owner: pr/o021-module-api-unification
---

# 优化机会条目索引

> 所有条目必须遵循 `items/_template.md`，并按 `status` 生命周期回写。  
> 入口机制见：[`../README.md`](../README.md)。

## 条目列表

| ID | 优先级 | 状态 | spec | 实现 | 证据 | 回写 | 文件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O-014 | P2 | done | [spec](../../../specs/102-o014-doc-impl-bidirectional-convergence/spec.md) | [docs](../README.md) | N/A（文档流程） | [specs 索引](../../specs/README.md) | [`O-014-doc-impl-bidirectional-convergence.md`](./O-014-doc-impl-bidirectional-convergence.md) |
| O-016 | P1 | done | N/A（direct task） | [core](../../../packages/logix-core/src/internal/runtime/core/module.ts) | N/A（非热路径） | [runtime SSoT](../../ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md) | [`O-016-readonly-subscription-ref.md`](./O-016-readonly-subscription-ref.md) |
| O-021 | P1 | writeback | [spec](../../../specs/102-o021-module-api-unification/spec.md) | [core](../../../packages/logix-core/src/Module.ts) | [perf](../../../specs/102-o021-module-api-unification/perf/README.md) | [module API SSoT](../../ssot/runtime/logix-core/api/02-module-and-logic-api.00-quick-overview.md) | [`O-021-module-instantiation-api-unification.md`](./O-021-module-instantiation-api-unification.md) |

## 回写要求

1. 修改条目状态时，必须同步更新本表。
2. 本表状态必须与 `../status-registry.json` 一致。
3. 标记 `done` 前，必须确认条目 `check` 全勾选。
