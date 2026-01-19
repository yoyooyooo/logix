# Quickstart: 081 Platform-Grade Parser MVP（AnchorIndex）

> 目标：在平台产品落地前，先通过 Node-only 能力构建 `AnchorIndex@v1`，用于可视化/门禁/回写前置。

## 1) 产物是什么

- `AnchorIndex@v1`：仓库级锚点索引（定义点/使用点/缺口点/降级原因）。
- 权威 schema：`specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`

## 2) 怎么运行（预期入口）

本特性最终由 Node-only 引擎与 CLI 暴露（见 `085`）：

- `logix anchor index`：输出 `AnchorIndex@v1`（默认 JSON 输出，支持落盘）。

## 3) 如何解读结果

- `entries[]`：Platform-Grade 子集内的锚点清单（包含 `ModuleDef/LogicDef/ServiceUse/WorkflowDef/WorkflowCallUse/AutofillTarget`）。
- `rawMode[]`：子集外/不确定形态的显式降级清单；每条必须带 `reasonCodes`（用于 CI/Devtools 门禁与可解释展示）。
- `WorkflowCallUse`：仅收录 `callById('<serviceId>')` 的字面量形态（供 079 收集可确定的 service 使用点）；`call(Tag)` 等糖默认降级，避免推断漂移。
- `AutofillTarget`：仅表示“存在可确定缺口点 + 可插入锚点”；实际是否补全/写回由 `079/082` 决定（宁可漏不乱补；只改缺失字段）。
