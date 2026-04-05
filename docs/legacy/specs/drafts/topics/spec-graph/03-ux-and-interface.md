---
title: 03 · UX & Visual Design (Make Graph Truly Useful)
status: draft
version: 1
---

# 03 · UX & Visual Design (Make Graph Truly Useful)

## 1. 设计目标：从“图”到“可决策的界面”

一个“完美”的 Spec Graph，必须同时满足：

- **可读**：默认视图不炸；通过降噪/聚焦让复杂图可用。
- **可操作**：搜索、过滤、聚焦上下游、点开文档都是一跳完成。
- **可解释**：用户明确知道为什么有这条边、为什么这个节点是红的。

## 2. 默认信息层级：Track Graph + Side Panel

### 2.1 Track Graph（默认）

- 节点：Track（`025`）
- 边：`depends`（实线箭头）+ `related`（虚线，默认局部显示）
- 节点内容（最小集）：
  - `ID`（等宽）
  - `Title`（来自主 artifact）
  - Badges：`stage`、`status`、`value`、`priority`

### 2.2 Side Panel（右侧）

选中节点后展示：

- Artifacts 时间线：Draft（L9→...→Topics）与 Spec（Spec）
- Inbound/Outbound：上游/下游列表（可点击聚焦与跳转）
- Issues：broken refs / cycles / duplicate ids（若涉及当前节点）

> 原则：把“细节信息”放到侧栏，而不是把节点撑成一坨小作文。

## 3. 交互（决定好不好用）

### 3.1 搜索与聚焦

- 搜索框支持：`TrackID`、标题关键词、路径、ItemID（可选）
- Enter：聚焦节点并 `Fit view`
- Esc：清空选择/退出聚焦模式

### 3.2 上下游 N 跳（降噪关键）

提供按钮：

- “Only upstream 1/2/3 hops”
- “Only downstream 1/2/3 hops”
- “Reset”

实现策略：把非相关节点/边 dim，而不是完全移除（保持方位感）。

### 3.3 Related 的默认策略

`related` 很容易把图变成毛线团，因此建议：

- 默认只显示 `depends`
- `related` 仅在：
  - 用户打开开关后才全局显示；或
  - 只在选中节点的 1 跳邻居范围内显示（局部 related）

### 3.4 跳转（必须一跳完成）

点击节点/侧栏列表：

- Draft：打开对应 Markdown（或在 Kanban Board 里定位）
- Spec：打开 `spec.md`（找不到则 fallback 到 `plan.md` 或目录）

## 4. 视觉编码（让用户“一眼懂”）

### 4.1 节点（Stage/Lane）

Stage 建议做成“泳道”（Pipeline 视图）或颜色/形态（Track Graph）：

- Draft：L9 更轻、更透明；L1 更实、更强调
- Topics：介于中间（收编态）
- Spec：更“确定”的视觉（例如更强边框/角标）

### 4.2 边（语义一致）

- depends：实线 + 箭头（方向明确）
- related：虚线（弱提示）
- promotes：细线/淡色（只在 Pipeline 视图默认显示）

### 4.3 问题态（必须显式）

- broken ref：红色边/红色角标，并在侧栏列出证据来源
- cycle：高亮成环路径（或至少在 Issues 面板提示）

## 5. 两个视图：Graph 与 Pipeline

### 5.1 Graph（Dependency）

目标：排期/影响分析。

- 布局：DAG（左→右或上→下）
- 默认：只显示 depends
- 关键动作：上下游 N 跳聚焦、过滤、搜索

### 5.2 Pipeline（Lifecycle）

目标：看沉淀轨迹（Draft→Spec）。

- 泳道：`L9..L1/Topics/Spec`
- promotes：默认显示（突出“从材料到交付”的路径）
- 依赖边：可选叠加（默认弱化或开关）

## 6. 组件选型（与现有 UI 风格对齐）

UI 组件优先选用 shadcn/ui（Tabs/Sheet/Command/Popover/Badge/Button/Input/Select/Tooltip）。
图形渲染建议用成熟方案承接缩放/拖拽/选择（例如 React Flow），布局用 dagre/elk 做自动排版。

