---
title: The "Excel-Killer" UX Paradigm: From Data Rows to Live State
status: draft
author: Antigravity
date: 2025-12-14
---

# The "Excel-Killer" UX: 降维打击的交互范式

## 1. 核心困境：Excel 的壁垒与软肋

用户提到的 Excel "胜在能力强"，本质上是因为：

1.  **高密度 (Density)**: 一屏能看 50 个字段。
2.  **自由度 (Freedom)**: 随便写，"针对墨西哥司机..." 这种自然语言毫无阻碍。
3.  **宏观视角 (God View)**: 所有字段都在这里，心里有底。

而传统 Web "后台管理表格" 的失败在于：

1.  **低密度**: 各种 Padding/Margin，一屏看 10 行。
2.  **低自由度**: 下拉框选不到就卡住，校验报错就变红，阻断思路。
3.  **割裂**: 定义了属性，却看不到逻辑（被藏在 Drawer 里）。

**Excel 的死穴 (我们的机会)**：

- **死文本 (Dead Text)**: Excel 里的逻辑只是字符，不仅无法执行，甚至无法验证"墨西哥"和"司机"是否矛盾。
- **无状态 (Stateless)**: 你无法在 Excel 里按下一个按钮："现在这也是墨西哥司机场景"，然后看着表格自动变色。
- **平铺 (Flattening)**: 它强行把立体的逻辑（条件 -> 结果）拍扁在一个二维单元格里。

## 2. 降维打击：Live Logic (活体逻辑)

要超越 Excel，不能做"更好的表格"，而要做 **"能动的沙盘"**。

### 核心交互概念：Scenario-Driven Definition (场景驱动定义)

与其让 PM 在一个个单元格里填空，不如让他们 **"玩"** 表格。

#### 2.1 The "What-If" Simulator (模拟器即定义器)

界面不再是一个静态的 Field List，而是一个 **Live Simulation Context**。

- **顶部栏**: 不是筛选器，而是 **Scenario Context (场景上下文)**。
  - PM 设置：`[ Country: Mexico ]`, `[ Role: Driver ]`.
- **主表格**: 实时响应这个 Context。
  - **可见性列**: 不满足条件的行自动变成半透明（Ghost），而不是不仅展示一大段 `If Mexico...` 的文本。
  - **必填性列**: 满足条件的行高亮显示。

**UX 魔法**:
PM 发现 "License Number" 字段在 "Driver" 模式下忘了设为必填。

- **Excel 做法**: 找到那一行，在 "必填逻辑" 列打字："如果是司机必填"。
- **Platform 做法**:
  1.  顶部切换 Context 为 `Driver`。
  2.  直接点击 "License Number" 行的 "Required" 开关。
  3.  系统自动生成逻辑：`WHEN (Role == Driver) THEN Required = True`。
  - **这就是降维打击**：利用当前的状态上下文，把"写逻辑"变成了"配状态"。

#### 2.2 Interactive Chips & Auto-Refactor (交互式芯片与重构)

对于必须手写逻辑的地方，我们不禁用自然语言，而是做 **即时结构化**。

- **输入**: PM 在单元格粘贴 "墨西哥部门且是HRMS同步的数据为只读"。
- **即时反馈**: 系统不需要弹出复杂的 Rule Builder，而是直接在单元格内把文字这变成三个高亮的 **Chips**：
  - `[Country: Mexico]` (Entity Match)
  - `[Source: HRMS]` (Enum Match)
  - `-> ReadOnly` (Effect)
- **Hover 能力**: 鼠标悬停在 `[Country: Mexico]` 上，系统高亮表格里**所有**用到这个条件的字段。
  - _Excel 做不到_: 你没法一眼看出"还有谁受墨西哥影响"。这大大降低了修改逻辑时的心理负担。

#### 2.3 The "Logic Heatmap" (逻辑热力图)

Excel 是平权的，每个格子一样重要。但实际上，80% 的字段很简单，20% 的字段巨复杂（也是 Bug 源头）。

- **Heatmap Mode**: 按一下热键，表格进入热力图模式。
- **颜色编码**:
  - 白色: 无逻辑，静态字段。
  - 浅蓝: 简单逻辑 (1-2 个条件)。
  - 深红: 复杂逻辑 (跨字段联动、异步校验、多重依赖)。
- **Value**: PM 一眼就能看到风险点在哪里。评审时只看红色的行。

## 3. 具体界面构想 (可交互草图)

### 界面布局

```
+-----------------------------------------------------------------------+
|  Scenario Bar:  [ 🌍 Country: Mexico ▾ ]  [ 👤 Role: Driver ▾ ]      |
+-----------------------------------------------------------------------+
|  Field Name      |  Type   |  Visibility (👀)  |  Required (*)      |
+-----------------------------------------------------------------------+
|  Full Name       | String  |  Always           |  Always            |
|  Driver License  | String  |  Yes (Matched)    |  [ON] (Click to set|
|                  |         |  └─ b/c Driver    |   cond: Driver)    |
|  Visa Info       | Object  |  No (Ghosted)     |  -                 |
|                  |         |  └─ only Non-MX   |                    |
+-----------------------------------------------------------------------+
|  RAW LOGIC VIEW (Bottom Pane - 类似 Excel 编辑栏，但更强)             |
|  > Rule for "Driver License":                                         |
|    When #Scenario.Role is 'Driver' -> Update Schema { required: true }|
+-----------------------------------------------------------------------+
```

## 4. 总结

我们不复刻 Excel，而是把 Excel 那个**隐式的、跑在 PM 脑子里的 "Runtime"** 显性化。

- Excel: PM 脑补 "如果是墨西哥..." -> 找到格子 -> 打字。
- Platform: PM 设置 "现在是墨西哥" -> 系统过滤/高亮格子 -> PM 仅仅确认/点击状态。

这不仅是 UI 的优化，更是思维方式的 **Shift Left**：把逻辑验证从"开发阶段"前置到了"定义阶段"。
