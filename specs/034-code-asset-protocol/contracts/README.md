# 034 Contracts: Code Assets & Deps（CodeAsset / Deps / ReversibilityAnchor）

本目录固化 **034 的协议合同（Contract）**：用于平台/Workbench/CI/Agent 侧校验并消费表达式/校验等“代码资产”（CodeAsset）协议。

## Schemas

- `schemas/code-asset.schema.json`
  - `CodeAsset@v1` payload（表达式/校验资产；可编辑源码层 + 规范化 IR + deps + digest + budgets/capabilities + anchor）

- `schemas/code-asset-ref.schema.json`
  - `CodeAssetRef@v1` payload（引用锚点：`digest`）

- `schemas/deps.schema.json`
  - `Deps@v1` payload（显式依赖：`reads/services/configs`；其中 `reads` 只允许 `output/export`）
  - `reads.items` 的地址空间引用 035 的 `PortAddress`：`specs/035-module-reference-space/contracts/schemas/port-address.schema.json`

- `schemas/reversibility-anchor.schema.json`
  - `ReversibilityAnchor@v1` payload（可逆溯源锚点；不影响运行语义）

## Determinism Requirements（硬约束）

- `digest` 必须只由稳定字段派生（禁止时间戳/随机盐/机器特异信息）
- `deps` 必须显式且可审阅（越界引用必须被拒绝）

