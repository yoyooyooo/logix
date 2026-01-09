# Quickstart: 081 Platform-Grade Parser MVP（AnchorIndex）

> 目标：在平台产品落地前，先通过 Node-only 能力构建 `AnchorIndex@v1`，用于可视化/门禁/回写前置。

## 1) 产物是什么

- `AnchorIndex@v1`：仓库级锚点索引（定义点/使用点/缺口点/降级原因）。
- 权威 schema：`specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`

## 2) 怎么运行（预期入口）

本特性最终由 Node-only 引擎与 CLI 暴露（见 `085`）：

- `logix anchor index`：输出 `AnchorIndex@v1`（默认 JSON 输出，支持落盘）。

## 3) 如何解读结果

- `entries[]`：可解析子集内的锚点清单（包含 `ModuleDef/LogicDef/ServiceUse/AutofillTarget`）。
- `rawMode[]`：子集外/不确定形态的显式降级清单；每条必须带 `reasonCodes`。
- `AutofillTarget`：仅表示“存在可确定缺口点”；实际是否写回由 `082/079` 决定（宁可漏不乱补）。
