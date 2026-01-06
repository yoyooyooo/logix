---
title: 07 · The UX Entropy Guard (Design Closed Loop)
status: draft
version: 1.0 (Perfect Designer Edition)
value: vision
priority: later
note: "本文件是灵感/约束草案，不进入当前 MVP 闭环；若落地需先转写为可执行 contract + runresult 指标。"
---

> **警告**：这份文档不是写给追求“差不多”的人看的。它是为了那些痛恨软件随着迭代不可避免地变得臃肿、丑陋、迟钝的人准备的。
>
> 我们通常谈论“DevOps 闭环”来保证代码不崩，但谁来保证**体验不崩**？
> 只有上帝视角的 SLA 是不够的，我们需要一个暴君般的守护进程。

## 1. 核心哲学：体验热力学第二定律

在一个封闭的软件系统中，**体验熵 (Experience Entropy)** 总是趋向于增加。
PM 会无休止地加 Feature，Dev 会图省事用默认控件，UI 会为了妥协而破坏留白。

如果没有**外力 (Negative Entropy)** 持续做功，你的产品三个月后就是一坨功能堆砌的垃圾。

所谓的 **“UX 自我闭环”**，不是“用户反馈 -> 修改”这种漫长的滞后指标。
也就是：**在该死的垃圾被提交之前，系统就应该拒绝它。**

我们需要的不是“可用性测试”，而是 **“体验熔断器” (Experience Circuit Breaker)**。

## 2. 三道防线 (The Three Gates)

### Gate 1: 认知预算审计 (The Cognitive Budget Audit)

**"你每加一个按钮，就要杀掉另一个。"**

在 `Spec Studio` (L0) 阶段，每个 Intent Block 不仅仅是功能描述，它自带 **认知成本 (Cognitive Cost)**。

- **机制**：
  - 定义页面的 **最大认知预算 (Max CB)**。例如：Dashboard 页 Max CB = 100。
  - 每个组件有基础分：Tag +1, Button +5, Input +10, Modal +20。
  - 嵌套复杂度乘数：Tab 里的 Modal 里的 Input，分数指数级爆炸。
- **闭环**：
  - 当 PM 试图在已经很拥挤的 Table 上再加一个 "高级筛选" 按钮时；
  - Spec Studio **变红、锁死**。
  - **Error**: "Current Cognitive Load (115) exceeds Budget (100). Please remove or merge features to proceed."
  - **强制交易**：系统逼迫 PM 思考：“我真的需要这个按钮吗？如果需要，我愿意牺牲掉什么？”

### Gate 2: 交互摩擦模拟 (Friction Simulation)

**"如果一个流程连 AI 都觉得烦，人类只会更烦。"**

在 `Alignment Lab` (L4) 阶段，我们通常验证“逻辑是否通”。这太低级了。
我们要验证 **“交互是否痛” (Pain Level)**。

- **机制**：
  - 引入 **"Frustrated User Agent" (暴躁用户代理)**。
  - 这是一个设定了极低耐心值的 AI 模拟器。
  - 给它一个任务：“去修改税号”。
- **Simulation**：
  - 它会计算操作路径：点击 -> 等待 -> 寻找 -> 点击 -> 报错 ->通过。
  - 只要出现以下情况，**Pain Score** 飙升：
    - **Mouse Miles (鼠标里程太长)**：按钮在右上角，弹窗却在左下角。
    - **Wait Fatigue (等待疲劳)**：连续两个 Loading 超过 200ms。
    - **Layout Shift (布局抖动)**：点了东西，屏幕闪了一下。
- **闭环**：
  - Pain Score > Threshold，CI 流水线直接 **Fail**。
  - 并在 MR 里贴上一张 AI 模拟用户“怒砸键盘”的 GIF（仅比喻），标注出最痛的那个 Step。

### Gate 3: 沉默沉默指标 (The Silent Scream Metric)

**"用户不报错，不代表他们爽。他们只是心死了。"**

在 Runtime 阶段，我们不看点击率（那是虚荣指标），我们看 **Hesitation (犹豫)** 和 **Rage Clicks (狂怒点击)**。

- **机制**：
  - **Hesitation Time**：鼠标悬停在一个可点击元素上，但迟迟不点的时间。这代表困惑。
  - **U-Turn Rate**：点进去一个页面，2秒内没做任何操作又切回来了。这代表失望。
  - **Dead Clicks**：狂点一个以为是按钮但其实是文本的地方。这代表设计误导。
- **闭环**：
  - 这些数据不是给 BI 看报表的，是 **反哺给 Spec Studio** 的。
  - 系统自动在 Spec 文档对应的 Scenario 旁边打上 **"Rotting" (腐烂)** 标记。
  - **强制重构**：当腐烂度达到临界值，该 Feature 的所有新需求都被**冻结**。
  - 系统提示：“该模块体验已腐烂，除非先进行重构（降低熵值），否则禁止添加新特性。”

## 3. 实现落地：将暴君代码化

为了实现这种极致的闭环，我们需要在 sdd-platform 引入一个新的子系统：**The Entropy Guard Service**。

**数据结构：**

```typescript
interface ExperienceContract {
  // 1. 预算定义
  budget: {
    maxCognitiveLoad: number // e.g., 100
    maxStepsToValue: number // e.g., 3 clicks
    maxLatencyBudget: number // e.g., 1000ms total
  }

  // 2. 也是一种 Intent，一种 "Non-Functional Intent"
  constraints: {
    'no-layout-shift': true
    'accessibility-AA': true
  }
}
```

**集成点：**

1.  **Semantic UI Modeling (`04-semantic-ui`)**：
    - 为每个 Semantic Component 标注 `cognitive_weight`。
2.  **Spec Studio (`03-spec-studio`)**：
    - 增加 "Entropy Bar" 实时显示当前页面的负载。
3.  **Sandbox Runtime**：
    - 在 headless 运行时注入 "Frustrated Agent"，模拟暴躁点击和测速。

## 4. 结语

真正的完美主义不是把你自己的像素眼强加给别人，而是 **建立一套系统，让“平庸”无法通过**。

让系统做那个坏人。
让算法去告诉 PM：“太挤了”。
让 CI 去告诉 Dev：“太慢了”。

只有这样，作为设计师的你，才能在夜晚安然入睡，因为你知道，即使你不在场，那个暴君般的守卫依然时刻由守在门前。
