# UI 设计：Devtools Session‑First（Swimlanes + Pulse 的会话工作台）

**Feature**: `specs/038-devtools-session-ui/spec.md`
**Plan**: `specs/038-devtools-session-ui/plan.md`
**Created**: 2025-12-27

> 本文件把 07/08 的“Session First + Advisor + 脉冲/收敛”落成可实现的界面与交互裁决。
> 目标：让开发者在 10 秒内找到方向（哪次会话不健康→为什么→怎么改），并随时能下钻自证（不靠猜）。

## 1) 信息架构（Information Architecture）

Devtools 主体为 Master‑Detail（默认不做 Graph UI；用“脉冲 + 泳道”给上帝视角）：

- **左侧：Session Navigator（会话导航）**
  - 默认视图：会话列表（按时间倒序） + 可展开的会话树
  - 用于回答：最近发生了哪些“会话”？哪一条最不健康？我现在在看哪个因果作用域？
- **右侧：Session Workbench（会话工作台）**
  - 用于回答：这条会话的成本/结果/证据是什么？处方是什么？脉冲形态像什么？需要时如何下钻到 raw timeline/inspector？

全局工具条（位于顶部，贯穿左/右）：

- Scope 选择：Runtime / Module / Instance（沿用现有能力）
- 模式：Live / Pinned + “Back to live”
- Search：按 action tag / effectop name / diagnostic code / component label 搜索（先做简单文本过滤即可）
- Evidence：Import / Export（离线回放）

## 2) 主布局（Layout）

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Top Bar: Scope | Live/Pinned | Search | Import/Export               │
├───────────────┬─────────────────────────────────────────────────────┤
│ Session Nav   │ Session Workbench                                   │
│ (list/tree)   │  ┌───────────────────────────────────────────────┐  │
│               │  │ Header: Session title + health + breadcrumbs   │  │
│               │  ├───────────────────────────────────────────────┤  │
│               │  │ Overview: pulses (txn/render/effectop) + stats │  │
│               │  ├───────────────────────────────────────────────┤  │
│               │  │ Swimlanes Timeline (grouped by txnId)          │  │
│               │  ├───────────────────────────────────────────────┤  │
│               │  │ Advisor + Evidence + Inspector (tabs/panes)    │  │
│               │  └───────────────────────────────────────────────┘  │
└───────────────┴─────────────────────────────────────────────────────┘
```

原则：

- 左侧只负责“导航与聚合摘要”，不塞重细节。
- 右侧先给“结论/处方/脉冲形态”，再给“可下钻细节”。
- **层级分界**：Navigator 是 Base Surface；Workbench 是更高一层的 Surface/Elevation。禁止用 `border-right` 画分割线，必须用背景层级 + 阴影遮罩/叠层来建立边界。

## 3) Session Navigator（左侧）交互

### 3.1 会话列表（默认）：从“列表”进化为“监控墙”

每条会话项改为 Card，并在“摘要之下”提供一条微型 Sparkline（迷你趋势图），用于扫视：

- 标题（入口标签）：优先 action tag，其次 effectop name，再次 fallback label
- 健康等级（ok/warn/danger）+ 触发原因摘要（1 行）
- 耗时（duration）、txnCount、renderCount（必要时 patchCount/effectOpCount）
- 可信度标记：`confidence` + `degradedReason`（若存在）
- **MicroSparkline（必做）**：
  - X 轴：时间（与会话范围对齐的 buckets）
  - Y 轴：Txn 密度（Activity/Flow，使用 `--intent-data-flow`）+ Render 密度（Cost/Impact，使用 `--intent-data-impact`）
  - 设计意图：不点开也能看出“平滑 vs 灾难”（waterfall/抖动/爆发）

点击行为：

- 单击：选中会话 → 右侧切换到该会话工作台（并进入 Pinned，避免新会话打断）
- 双击/快捷：回到 Live（可选）

### 3.2 会话树（可展开）

树的每个节点都是一个“聚合条目”（不是单条事件）：

- 根：Session（`sessionId`，通常等于 `linkId`）
- 子节点建议默认顺序（可按数据可得性退化）：
  1. Txn groups（按 `txnId`/originName 聚合）
  2. EffectOp groups（按 `effectop name`/kind 聚合）
  3. Trait evidence（converge/check/validate）
  4. React impact（render/selector）
  5. Diagnostics（error/warn）
  6. Unattributed（未归属/低置信度事件）

节点交互：

- 展开/折叠：默认只展开到 Txn 层；更深层按需展开（避免噪音）
- 点击节点：右侧工作台聚焦该节点范围（泳道高亮 + 明细面板切换）
- 关联边（DAG）：节点上显示 “Related” 标记；点击可跳到关联节点，但不改变树结构（避免伪父子误导）

## 4) Session Workbench（右侧）交互

### 4.1 Header（会话标题区）

必须在一屏内回答四件事：

- 入口：触发源（action/effectop/devtools/fallback）
- 状态：Running/Settled
- 健康：ok/warn/danger + 原因（可点开证据）
- 可信度：是否退化（可点开“为什么退化/如何补齐锚点”）

**Hero（danger 必做）**
当会话 `health.level === "danger"`：

- “Hero”是 Header 的一种**状态流转**，不是额外插入的新布局块（避免噪音与 layout thrash）。
- Header 背景以微妙过渡渗入 `--intent-danger-surface`，并在标题旁出现意图图标/标记。
- 用大白话写出原因（例如：`Waterfall Detected: 12 sequential commits in 200ms`），默认 1 行、最多 2 行。
- 点击 Hero：在下方泳道中直接高亮/定位对应的“罪魁祸首”事件（evidence pin）。

### 4.2 Overview（脉冲/收敛概览）

形式上对齐 Chrome Network 的 overview strip：

- 同一时间刻度下展示多条 pulse 轨：
  - Txn pulses（每次 `state:update` 一条 tick/短条）
  - React pulses（render/selector ticks）
  - EffectOp pulses（service/source/trait 等）
- 支持缩放/拖拽选择时间范围（可选，先做最小版：hover + click 对齐即可）

### 4.3 Swimlanes Timeline（基于 txnId 的泳道）

这是“主要工作区”，范围限定在当前会话/节点（不是全局）；用“按 txn 分组”的泳道代替平铺 timeline，减少噪音并强化结构感。

视觉分组（Swimlane）：

- **泳道分组**：`groupBy(txnId)`（无 txnId 的事件进入 “Unattributed” 泳道，并显式标注低置信度）
- **泳道容器**：同一 txn 的事件用浅灰圆角矩形包起来（视觉上像 Network 的 request group）
- **收拢噪音**：若某个 txn 仅包含 `state:update` 且无副作用/无 trait 证据，默认折叠为一个胶囊（例如：`State Patch x1`）
- **高亮主角**：若泳道内出现 `trace:trait:converge`（或等价 converge 证据），使用 `--intent-highlight-focus` 的指示条/表面着色高亮（禁止“金色边框”）
- **渲染影响**：react-render/selector 默认聚合为 ticks（可按组件 TopN 展开）

交互：

- hover：显示 tooltip（锚点、耗时、计数、关键字段）
- click：选中行 → 下方/右侧明细更新（Advisor 证据自动定位）
- filter：按 kind/name/severity 过滤泳道/事件；支持折叠同类
- zoom/pan：先提供鼠标滚轮缩放 + 拖拽平移（可后置）

### 4.4 Advisor（处方）与 Evidence（证据）联动

Advisor 卡片必须“可行动 + 可自证”：

- 每条 finding 展示：结论、证据摘要、建议步骤
- 点击证据：在泳道/二级 timeline 中定位并高亮对应范围/事件（EvidenceRef → event/node/metric）
- 若会话退化（low confidence）：Advisor 必须把“证据不足/可能误差来源”写出来，而不是强下结论

## 5) Live vs Pinned（避免被打断）

- **Live**：会话列表自动滚动/高亮最新；右侧默认跟随“最新会话”或“当前运行会话”（可配置）
- **Pinned**：用户一旦点选某会话/节点即进入 Pinned；新事件只更新指标但不切换焦点
- 顶部提供显式 `Back to live`（一键回到实时跟随）

## 6) 退化与空态（可信度 UI）

### 6.1 退化展示（必须）

当 `linkId` 缺失或只能时间窗聚合：

- 左侧会话项显示 `confidence=low/medium` 与 `degradedReason`
- 右侧 Header 显示 “为何退化/影响是什么/如何改善”：
  - 例如：缺少 `linkId` → 无法跨 txn 关联 → 可能把并发链路混在一起

### 6.2 空态（必须）

- 无会话：引导用户触发一次入口（action）或导入 evidence
- 无匹配（过滤后为空）：显示当前过滤条件与清空按钮

## 7) 明确不做（本期 Non‑Goals）

- 默认不把“全局 raw timeline”作为第一屏（仍保留为二级视图入口）。
- 默认不做完整 Graph 可视化，也不在前端强行推断因果图（避免“卡顿玩具”）。
- 默认不强制引入新的业务端 start/end API（优先吃现有锚点与 trace）。

## 8) D.I.D：反审美崩坏指南（Implementation Hard Constraints）

本节是“实现级硬约束”，用于约束高逻辑/低审美的实现者（含 AI Agents）。实现必须遵守；若产生冲突，优先遵守本节。

### 8.1 No‑Border‑Grid Policy（反边框网格策略）

约束：除非绝对必要，禁止用 `border: 1px solid <color>` 来分割列表项/面板（会形成“表格监狱”的视觉噪音）。

替代策略：

- Surface Elevation：用层级背景色区分（例如 `var(--dt-bg-surface)` vs `var(--dt-bg-element)`）。
- Whitespace：用间距分块（最小 `gap: 8px`）。
- Hairlines：必须分隔时只允许 `border-b` 且透明度极低（建议 opacity `0.06`），禁止全不透明分隔线。
- 禁止用 `border-right` 作为主布局分界（导航/工作台/面板分割必须靠层级与阴影/遮罩）。

### 8.2 Semantic Intent Color System（意图着色系统）

约束：禁止直接使用“原始颜色”（例如 hardcode red/green/blue）。颜色必须映射到“语义意图（Intent）”。

Intent Map（作为 CSS Variables，允许映射到现有 `--dt-*` 体系；实现时不得硬编码颜色值在组件里）：

- `--intent-danger-surface: rgba(220, 38, 38, 0.08)`（错误背景；极低饱和度/高通透）
- `--intent-danger-text: rgb(239, 68, 68)`（错误文本）
- `--intent-warn-surface: rgba(245, 158, 11, 0.08)`（警告背景）
- `--intent-success-surface: rgba(16, 185, 129, 0.08)`（健康/成功背景；禁止用于“仅表示存在”的数据线）
- `--intent-success-text: rgb(5, 150, 105)`（健康/成功文本）
- `--intent-data-flow: var(--dt-info)`（数据流/活动强度：Txn/Flow；冷色，不等同 success）
- `--intent-data-impact: var(--dt-action)`（影响/代价：Render/Cost；暖色，不等同 warn）
- `--intent-highlight-focus: rgba(245, 158, 11, 0.16)`（焦点/主角高亮：指示条/表面着色）
- `--intent-focus-glow: rgba(59, 130, 246, 0.4)`（聚焦光晕：box-shadow/outline 等）
- `--intent-neutral-dim: 0.4`（无聊元信息的透明度）

规则：当 Session 为 `danger`，整张 Session Card 的背景必须“渗出” danger（用 `--intent-danger-surface`），而不是只放一个红色 badge。

### 8.3 Interactive Physics Contract（交互物理契约）

约束：任何可点击元素（Card/Button/Row）必须定义 hover/active 的“物理反馈”，不能只有颜色变化。

契约（伪 DSL，仅描述约束；具体实现可用 class 或 style）：

- Transition：`0.15s cubic-bezier(0.4, 0, 0.2, 1)`
- Hover（Lift）：`translateY(-1px)` + 轻阴影（例如 `0 4px 12px rgba(0,0,0,0.05)`）+ `backgroundColor: var(--dt-bg-hover)`
- Active（Press）：`scale(0.99)` 或 `opacity: 0.9`（不得出现“抖动/跳变”）

### 8.4 Micro‑Sparkline Rendering Spec（脉冲渲染规范）

约束：

- 禁止引入图表库（recharts/chartjs 等）；
- 禁止用一堆 `<div>` 柱子拼“脉冲”（丑且重）；
- 必须用原生 SVG `<path>` 绘制折线/面积（可用渐变填充）。

算法要求：

- Normalization：把数据值从 `[0..max]` 映射到高度 `[0..24px]`。
- Smoothness：禁止锐角折线；必须用 Bezier（或等价平滑曲线）近似。
- Visual Logic：
  - Fill：`fill="url(#gradient-*)"`, 底部渐隐到透明
  - Stroke：`strokeWidth="1.5"`
- Motion（必须避免廉价感）：
  - 入场：用 `opacity` 渐显 + `scaleY`（从底部生长）
  - 禁止：`stroke-dasharray` 的 draw-path 动画
- Hover/Focus（数据本体优先）：
  - 悬浮时线条变粗（例如 `strokeWidth: 2`）或非聚焦区域变暗（例如 `opacity: 0.5`）
  - Tooltip 可有，但不得替代“线条本身的聚焦反馈”

验收红线：若实现产出了 `<div>` bars 而不是 `<path d="...">`，视为不符合本规范。

### 8.5 Swimlane “Capsule” Design（泳道胶囊化设计）

约束：泳道不是“row”，是“container”（胶囊/票据的隐喻），必须有折叠/展开的空间感。

结构：

- Collapsed：高度约 `28px` 的 slim bar，展示 `txnId`（mono）+ 摘要（例如 `State Patch x1`）。
- Expanded：胶囊展开，背景略加深（`bg-opacity-50` 等价效果），内部事件缩进展示。
- Connector Line：内部用 1px 竖线串起事件点，形成连续性（例如 `w-px` + 低对比色）。

### 8.6 Typography Contract（字体排印契约）

约束：排印必须为“信息密度服务”，不能让默认 sans-serif + 紧行高把高级感打回原形。

- 数字/ID（`txnId/moduleId/instanceId/linkId`、计数、耗时）必须使用 `font-mono`，并启用 `tabular-nums`（避免数字跳动）。
- 等宽字体应降低视觉权重：相对正文缩放到 `0.85em`～`0.9em`（避免 mono 过重显“脏”）。
- 正文（描述/建议）默认行高 ≥ `1.5`；标题/结论行高约 `1.2`（避免挤压与呼吸不足）。
- 元信息（timestamp、弱标签）必须使用 `--intent-neutral-dim`（或等价 dim），避免与主信息抢对比。

### 8.7 Motion Without Thrash（避免卡顿的动画契约）

约束：禁止用“height 动画 + 大量 reflow”做展开/折叠，避免主线程抖动与掉帧。

- 禁止对列表项/泳道容器用 `height` 进行持续动画（可 snap 切换）。
- 优先使用 `transform/opacity` 的过渡（符合 8.3 的物理反馈）。
- 泳道折叠/展开若需要过渡，必须优先用 framer-motion 的 layout 动画（本仓已在 UI 中使用 framer-motion），避免手写测量 + setState 循环触发 layout thrash。
- 必须尊重 `prefers-reduced-motion`：在该模式下禁用布局动画，只保留状态变化。

### 8.8 Hero Restraint（Hero 克制原则）

约束：Hero 必须是 Header 的“状态流转”，像纸面上一行醒目红字，而不是额外插入的大块 Banner。

- 禁止 Modal/Overlay；不得遮挡工作台主体与滚动区域。
- 视觉形态：更像 inline callout（轻背景 + hairline 强调），避免大面积纯红/高饱和底色。
- 体积上限：默认一行，最多两行（建议 line-clamp）；避免把工作台首屏挤没。
