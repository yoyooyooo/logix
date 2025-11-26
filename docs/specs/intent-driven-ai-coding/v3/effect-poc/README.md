---
title: Effect Runtime PoC (v3 Reference Implementation)
status: active
version: 3 (Unified API)
---

> **核心目标**：验证 v3 架构下的 **Unified API**、长逻辑封装风格和 **Static Analysis** 可行性。本目录包含可运行的 TypeScript 代码，作为 Logix 平台的参考实现。

## 目录结构（v3 收敛中）

*   `shared/`: 核心基础设施。
    *   `logix-v3-core.ts`: v3 版 Store / Logic / Flow 核心类型与示例。
    *   `effect-types.ts`: Effect / Layer 等基础类型别名。

*   `scenarios/`: 基于 v3 标准的业务场景 PoC。
    *   `search-with-debounce-latest.ts`: 使用 `fromChanges + debounce + filter + runLatest` 的搜索场景，并通过 Tag 注入 `SearchApi` 服务。
    *   `long-task-pattern.ts`: 使用 `patterns/long-task.ts` 中封装好的长逻辑（`Effect.forkScoped`）与 `runExhaust` 的进度更新场景。
    *   `approval-flow.ts`: 使用封装好的长逻辑组合“审批决策 + 审计 + 刷新列表”，并通过 `runExhaust` 保证提交幂等。
    *   `job-runner-service-config.ts`: 演示 `Effect.Service` + Config 读取 + Tagged Error（JobFailedError）的组合用法。

*   `patterns/`: 可复用的 pattern 资产（Effect-native）：
    *   `long-task.ts`: 长任务进度更新 Pattern；
    *   `bulk-operations.ts`: Selection + BulkOperation + Notification 批量操作 Pattern；
    *   `file-import-flow.ts`: 文件上传 + 导入任务 + 轮询状态 Pattern；
    *   `optimistic-toggle.ts`: 乐观开关 Logic Pattern。

## 运行指南

本目录代码基于 `effect` 库。旧版 LogicDSL PoC 仍可参考 `archive/*` 下代码与 `archive/shared-legacy/runtime.ts` 的实现；  
v3 版 Store / Logic / Flow 当前以类型与示例为主，后续运行时实现会在 `runtime-logix` 文档与子包中演进。

## 关键验证点

1.  **类型安全**: 验证 v3 版 Store / Logic / Flow / Control / Service / Config 在典型场景下的推导效果。
2.  **运行时行为**: 旧版 PoC 继续用于验证 `RuntimeLayer` 行为，新版运行时将迁移到统一的 Logix Engine。
3.  **长逻辑封装风格**: 在运行时核心中，推荐将长逻辑封装为普通的 `(input) => Effect` 函数，资产化和 meta 由平台侧在自身实现中消费。
