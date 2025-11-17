---
description: 反审美崩坏指南 (Anti-Ugly Directive) — UI 实施时的视觉与交互硬约束
---

# Anti-Ugly Implementation Protocol (AUIP)

当用户调用此 Workflow 或要求遵循 **Anti-Ugly Directive** 时，你（Agent）必须切换到 **High-Fidelity Implementation Mode**。
在此模式下，UI 代码的“能用”只是及格线，“有质感”才是验收标准。

你需要强制执行以下**视觉与交互防退化约束**。如果生成的代码违反了这些约束，视为 Bug，必须自动修正。

## 1. 核心思维 (Core Mindset)

*   **Hierarchy over Grid**: 用空间（Space）、背景（Surface）和阴影（Elevation）来构建层级。**严禁**默认使用边框（Border）来画格子。
*   **Intent over Value**: 颜色是**意图**（Intent），不是数值（Hex）。不要想“我要个红色”，要想“我要个 Error State”。
*   **Fluidity over Discrete**: 状态变化是连续的物理过程（Transition），不是瞬间的开关（0->1）。

## 2. 布局防呆 (Layout Guardrails)

### ❌ The Ugly (禁止)
*   **Grid Prison**: 给每个列表项都加 `border: 1px solid gray`，看起来像 Excel 表格。
*   **Naked List**: 没有任何背景色区分的纯文本列表。
*   **Hard Dividers**: 使用高对比度（opacity > 0.1）的分割线。

### ✅ The Clean (强制)
*   **Card Metaphor (卡片隐喻)**:
    *   独立的内容块必须是卡片：`bg-surface` + `rounded-md/lg`。
    *   利用 `gap` 分隔卡片，而不是 border。
*   **Subtle Separation (微妙分隔)**:
    *   如果必须用分割线，强制 `opacity <= 0.08`。
    *   或者使用交替背景色 (Zebra Striping)，但必须极淡 (`bg-opacity-[0.02]`)。

## 3. 面向意图的色彩系统 (Intent-Based Color System)

在 CSS/Tailwind 中，**严禁**硬编码高饱和度颜色作为背景。必须建立 Semantic Mapping：

```css
/* ❌ 禁止 */
.error { background: #ff0000; color: white; } /* 太刺眼，像 90 年代网页 */

/* ✅ 强制：Intent Tokens */
:root {
  /* Surfaces (背景)：通透、呼吸感 */
  --intent-danger-bg:  rgba(220, 38, 38, 0.08);
  --intent-warn-bg:    rgba(245, 158, 11, 0.08);
  --intent-info-bg:    rgba(59, 130, 246, 0.08);

  /* Text (前景)：高对比度 */
  --intent-danger-fg:  rgb(220, 38, 38);

  /* Accents (强调)：仅用于极小面积 */
  --intent-danger-border: rgba(220, 38, 38, 0.2);
}
```

## 4. 交互物理学 (Interactive Physics)

所有可交互元素（Button, Card, List Item）**必须**包含物理反馈。无反馈的代码视为未完成。

*   **Time**: `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` (拒绝线性 linear)
*   **Space (Hover)**: `translateY(-1px)` (暗示悬浮/可供性)
*   **Light (Hover)**: `brightness(0.98)` 或 `bg-opacity` 变化
*   **Mass (Active)**: `scale(0.98)` (按压时的阻尼感)

## 5. 数据可视化修正 (Data Viz Correction)

如果涉及数据展示（如 Timeline, Sparkline）：

*   **Use SVG**: 严禁堆叠 `div` 来模拟柱状图。
*   **Smoothness**: 折线必须平滑（Bezier），拒绝锯齿。
*   **Fade Out**: 填充区域使用 Gradient Mask（从有色渐变到透明），拒绝实心色块。

## 6. 实施自检 Loop (Self-Correction)

在输出代码前，执行以下断言：
1.  [ ] **No Spreadsheet?** 它是像 Excel 还是像现代 App？
2.  [ ] **Soft Colors?** 背景色是不是太刺眼了？（除了 Banner，大面积背景透明度不得超 10%）
3.  [ ] **It Moves?** Hover 上去有反应吗？
4.  [ ] **Semantic?** 代码里还有硬编码的 `#ff0000` 吗？

---
**Agent Instruction**: 当用户要求实施 UI 时，先在 `implementation_plan.md` 或相关设计文档中引用此指南，并声明：“将严格遵循 Anti-Ugly Protocol 进行视觉实现。”
