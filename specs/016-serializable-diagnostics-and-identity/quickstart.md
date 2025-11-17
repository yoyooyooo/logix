---
description: "Quickstart for validating 016 core hardening (serializable diagnostics + stable identity)"
---

# Quickstart: 016 可序列化诊断与稳定身份（验证路径）

> 本 quickstart 聚焦 **core 拉齐** 的验收路径（可序列化 + `instanceId` 单锚点 + 分档预算）。Devtools 组件/015/Chrome 插件交付面按 016 `tasks.md` 的 Deferred Phase 另行推进。

## 验收目标（对应 016 Success Criteria）

- `SC-001`：任意 EvidencePackage 必须可 `JSON.stringify` 成功；导入端不因不可序列化字段崩溃（证据包导入/导出在 Deferred Phase 补齐，但 core 侧必须先保证可导出事件与 snapshot 可 JSON 化）。
- `SC-002`：导出/跨宿主事件以 `instanceId` 为唯一实例锚点；Devtools 只依赖 `instanceId` 聚合实例。
- `SC-003`：诊断 off 档位近零成本；light/full 档位单条事件 JSON 化体积有上界（默认 ≤4KB）。

## 最小验证集（推荐顺序）

1. **序列化硬门（lifecycle:error）**
   - 构造不可序列化 `cause`（例如包含 `bigint`/循环引用/函数）。
   - 断言：归一化后的可导出事件与 Hub snapshot 均可 `JSON.stringify`，且包含 `errorSummary` + `downgrade.reason`。

2. **单锚点（instanceId）**
   - 断言：`module:init/module:destroy/state:update/lifecycle:error/diagnostic` 等可导出事件均包含 `moduleId + instanceId`。
   - 断言：聚合 key 与 label 不依赖任何“第二锚点字段”。

3. **分档与预算**
   - off：不产生可导出事件；不触发递归 JsonValue 投影扫描。
   - light/full：事件 `meta` 经投影/裁剪后满足默认预算（≤4KB），超限被截断/省略并标记 `oversized`。

4. **性能门槛（off 近零成本）**
   - 按 `specs/016-serializable-diagnostics-and-identity/perf.md` 的口径运行基线脚手架。
   - 断言：off 档位相对 baseline 的 p95 ≤ +5%，并能解释 light/full 的额外开销来源。

## 对照文件（从哪里读“最终口径”）

- 016 tasks（执行入口）：`specs/016-serializable-diagnostics-and-identity/tasks.md`
- 016 data model：`specs/016-serializable-diagnostics-and-identity/data-model.md`
- 005 JsonValue schema：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- 011 error summary schema：`specs/011-upgrade-lifecycle/contracts/schemas/error-summary.schema.json`
