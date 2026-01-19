# 081 · Platform-Grade Parser Contracts

本目录固化 081 的 contracts（长期可存储、可 diff 的协议面），用于平台/CI/Devtools 统一消费：

- `AnchorIndex@v1`：仓库级锚点索引（定义点/使用点/缺口点/降级原因）

## Schemas

- `schemas/anchor-index.schema.json`
  - Title: `AnchorIndex@v1`
  - Kind: `AnchorIndex`
  - Invariants:
    - JSON-safe、确定性、稳定排序
    - 子集外显式 `rawMode[]` + `reasonCodes`
    - 缺口点通过 `missing.*.insertSpan` 提供“只改缺失字段”的插入锚点（包含 `missing.workflowStepKey`）
