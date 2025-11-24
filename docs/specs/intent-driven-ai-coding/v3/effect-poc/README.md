---
title: Effect Runtime PoC (v3 Reference Implementation)
status: active
version: 3 (Unified API)
---

> **核心目标**：验证 v3 架构下的 **Unified API**、**Pattern System** 和 **Static Analysis** 可行性。本目录包含可运行的 TypeScript 代码，作为 Logix 平台的参考实现。

## 目录结构

*   `shared/`: 核心基础设施。
    *   `dsl.ts`: `LogicDSL` 接口定义 (The Contract)。
    *   `runtime.ts`: `RuntimeLayer` 实现 (The Implementation)。
    *   `pattern.ts`: `definePattern` 工具函数。

*   `patterns/`: 通用 Pattern 库 (Assets)。
    *   `debounced-search.ts`: 防抖搜索。

*   `scenarios/`: 业务场景实战 (Usage)，每个 PoC 对应一个单文件。
    *   `poc-01-simple-search.ts`: 基础搜索场景（调用 `DebouncedSearch`）。
    *   `poc-approval-flow.ts`: 审批流（决策 + 审计 + 刷新列表）。
    *   `poc-bulk-operations.ts`: 批量操作（选中项批量处理）。
    *   `poc-crud-form.ts`: 表单加载与提交。
    *   `poc-dependent-selects.ts`: 级联下拉（省 / 市 / 区）。
    *   `poc-file-import.ts`: 文件导入（上传 + 轮询任务）。
    *   `poc-long-task-polling.ts`: 长任务轮询。
    *   `poc-optimistic-toggle.ts`: 乐观更新开关。
    *   `poc-order-export.ts`: 订单导出。
    *   `poc-search-with-debounce.ts`: 单次搜索 + 结果落盘。

## 运行指南

本目录代码基于 `effect` 库。你可以直接运行这些文件来验证逻辑执行结果。

```bash
# 示例：运行基础搜索场景 PoC
ts-node scenarios/poc-01-simple-search.ts
```

## 关键验证点

1.  **类型安全**: 验证 `dsl.call` 和 `Context.Tag` 的类型推导是否正常。
2.  **运行时行为**: 验证 `RuntimeLayer` 是否正确执行了副作用。
3.  **Pattern 组合**: 验证 `definePattern` 产出的 Effect 是否能被正确组合。
