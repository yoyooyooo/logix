# 逻辑优先与 UI 无关 (Logic First & UI Agnostic)

> "Logic is the asset. UI is the projection."
> "One Logic, Any Runtime."

在 Logix 的三位一体意图模型（Trinity Model）中，我们极其强调 **UI (Presentation)** 与 **Logic (Behavior)** 的彻底解耦。这不仅是为了架构的整洁，更是为了适应 AI 时代的新生产关系。

## 1. 灵魂与躯壳

- **Logic (灵魂)**：业务规则、状态流转、副作用编排。它是企业的**核心数字资产**，具有高度的稳定性。
- **UI (躯壳)**：像素布局、交互动效、组件库选择。它是**易变的投影**，随着设计潮流（拟物 -> 扁平 -> 玻璃拟态）不断更迭。

Logix 主张：**先把灵魂提炼出来，再为它穿上不同的躯壳。**

## 2. 信号驱动 (Signal Driven)

为了实现这种解耦，Logix 采用了**信号驱动**的架构：

- **UI 只负责 Emit Signal**：此按钮点击后发出 `submitOrder` 信号。它不关心谁处理、怎么处理，甚至不关心有没有人处理。
- **Logic 只负责 Listen Signal**：监听到 `submitOrder` 信号，开始执行业务流。它不关心信号来自 React 按钮、Vue 组件，还是一个定时器、甚至是一个单元测试脚本。

这种架构不仅实现了 UI/Logic 的物理分离（文件级），更实现了**认知分离**。

## 3. One Logic, Any Runtime

一旦逻辑被剥离为纯粹的 Signal/Event Stream，它就获得了极大的自由度：

1.  **跨端复用**：同一套“购物车逻辑”，可以同时驱动 Web 端、React Native 端和小程序端。只需更换 UI 层（适配层）。
2.  **前后端流转**：一段“库存校验”逻辑，既可以在前端运行（提供即时反馈），也可以无缝迁移到后端运行（作为 API 流程）。因为逻辑本身是用 Effect-TS 编写的，与 DOM 无关。
3.  **无头测试 (Headless Testing)**：测试业务逻辑时，不需要启动浏览器，不需要 Mock DOM。直接向 Logic 发送信号，断言状态变化。速度极快，稳定性极高。

## 4. AI 的视角

对于 AI 而言，“逻辑”和“视觉”属于两种完全不同的模态：

- **逻辑**适合用 LLM 的**推理能力**（Reasoning）生成。
- **视觉**适合用多模态模型或**生成式 UI**（Generative UI）生成。

将两者强耦合在一起（例如在 React 组件里写 `useEffect` 做业务）是 AI 生成代码质量低下的主要原因——AI 会在由于需要同时顾及“像素对齐”和“业务正确性”而顾此失彼。

Logix 让 AI **分而治之**：

- Agent A 专注生成无懈可击的 Logic Intent。
- Agent B 专注为这个 Logic 生成精美的 UI Intent。
