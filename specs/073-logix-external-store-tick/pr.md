# PR：命名收敛提案（FlowProgram → Workflow）——对齐 073/075 与平台口径

> 目的：把“自由编排层（Π）”的命名在 **对外 DX** 与 **对内/平台** 之间收敛为同一个词：`workflow`，避免在同一条链路里同时出现 `Flow` / `FlowProgram` / `Workflow` 造成心智噪音与文档漂移。

## Status

- **Active（Draft）**：这是一个“改名建议/对齐备忘”，不包含实现；权威落点仍以 `specs/075-flow-program-codegen-ir/*` 与平台 SSoT 为准。

## 背景：073/075 的分层已经写清，但命名还在漂移

在 `specs/073-logix-external-store-tick/spec.md` 我们明确固化了三层分工：

1. 观测参考系：`RuntimeStore + tickSeq`
2. 受限绑定：Traits（externalStore/source/link…）
3. 自由编排：Control Laws / **Workflows（Π）**

而在 `specs/075-flow-program-codegen-ir/spec.md` 中：

- 平台/协议侧的权威输入叫 `WorkflowDef`，导出 slice 叫 `Workflow Static IR（Π slice）`
- 但 DX 值对象叫 `FlowProgram`（并且 spec 已经注明“未来可更名为 Workflow”）

这会导致一条链路上出现三套词：

- `Flow`（已有的 Flow API / FlowRuntime）
- `FlowProgram`（075 的 DX 值对象）
- `Workflow`（平台口径：Π/WorkflowDef/workflowSurface）

对新成员非常不友好，也容易让工作台/Parser/Rewrite 文档出现“同义不同名”的长期漂移。

## 提案：内外一致都叫 Workflow（Flow 继续保留为另一条概念）

### 1) 建议改名裁决（仅命名，不改语义）

- 对外 DX 值对象：`FlowProgram` → **`Workflow`**
  - 仍然是“携带 `WorkflowDef` 的值对象”
  - 仍然只提供冷路径方法：`validate / exportStaticIr / install / toJSON / fromJSON`
- 落盘权威输入：继续叫 `WorkflowDef`（不变）
- 导出工件：`WorkflowStaticIr` / `workflowSurface`（不变）
- 运行时已有 `Flow`（订阅/管道/执行语义）保持原名，不混入 Π/workflow 语义

> 直觉：`Flow` = “运行时订阅/管道”；`Workflow` = “可导出/可编译的控制律（Π）”。

### 2) 不做的事（避免把改名变成“补丁化大工程”）

- 不在 073 内实现任何 075 的 API
- 不提供兼容层（forward-only）：不保留 `FlowProgram` 的 alias；只提供迁移说明/批量替换建议
- 不重命名协议字段（例如 `workflowSurface`、`WorkflowDef`）——这些已是平台真理源的一部分

## 直接改名会引出的“需要先裁决”的点

> 这些点不解决，改名会变成“名改了但心智仍分裂”。

1. **锚点命名：`programId/nodeId` 是否也要收敛为 `workflowId/stepKey`？**
   - 075 的 contracts（tape/diagnostics）里当前大量使用 `programId/nodeId`
   - 如果外部改名为 `Workflow`，但事件锚点仍叫 `programId`，会产生新一轮歧义
   - 建议：要么明确“历史命名保留（programId=workflowId）”，要么一次性同步改名并 bump 相关 digest/schema 版本（forward-only）

2. **`Flow` 与 `Workflow` 的边界文案要不要在平台 SSoT 固化？**
   - 目前 075 已经在 spec 里写了定位，但平台侧文档/Workbench 页面也需要统一口径（避免 UI 上仍写 FlowProgram）
   - 建议：把“Π=Workflow（def+slice）/Flow=运行时订阅管道”的术语裁决回写到平台 glossary 或 contracts（以 SSoT 为准）

3. **公共子模块命名：`@logixjs/core/FlowProgram` 是否改为 `@logixjs/core/Workflow`？**
   - 075 tasks 里计划新增 `packages/logix-core/src/FlowProgram.ts`
   - 若采纳本提案，建议直接落为 `packages/logix-core/src/Workflow.ts`，避免“实现落地又制造一次迁移”

4. **与 012 Program→Process 的交叉：`FlowProgram` 这个词会不会与“Program API”继续冲突？**
   - 012 已把 Program 语义收口到 Process 侧；继续保留 `FlowProgram` 会把“Program”这个词重新引回公共 API
   - 这也是倾向改名为 `Workflow` 的直接动机之一

## 建议落点（如果采纳）

1. 在 `specs/075-flow-program-codegen-ir/*` 内先完成“命名裁决”更新（spec/contracts/quickstart/tasks）
2. 同步 Workbench 文档措辞（`docs/specs/sdd-platform/workbench/*` 中 `FlowProgram` 的表述）
3. 真正进入实现时（`packages/logix-core`）：
   - 直接以 `Workflow` 名称落盘（不做 alias）
   - 在迁移文档里给出“从 FlowProgram 改名为 Workflow”的一次性替换指引

## 关联入口（读这些就够定位）

- 073 分层（tick/traits/workflows）：`specs/073-logix-external-store-tick/spec.md`
- 075 定位与“双层同心圆 API”：`specs/075-flow-program-codegen-ir/spec.md`
- 075 public API 合同：`specs/075-flow-program-codegen-ir/contracts/public-api.md`
- Workbench 里对 Π 的口径：`docs/specs/sdd-platform/workbench/05-intent-pipeline.md`

