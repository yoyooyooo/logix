---
title: 长期蓝图：自愈架构与全双工编排 (Long-term Blueprint)
status: living
---

> 本文档描绘了 Intent-Driven AI Coding 平台的终局形态。它指引着架构的演进方向，确保每一个版本的迭代都在向着这个未来迈进。

## 1. 演进路线图 (Roadmap)

*   **Phase 1 (v3 - Current)**: **意图显影引擎**。确立三位一体模型，实现 Spec -> Impl 的单向生成与手动精修。重点在 DX (开发体验) 和 Pattern 资产化。
*   **Phase 2 (v4)**: **全双工编排**。实现 Code <-> Graph 的双向同步与实时可视化调试。重点在可视化与低代码能力的融合。
*   **Phase 3 (v5)**: **自愈架构**。实现 Generate -> Run -> Verify -> Fix 的全自动闭环。重点在 AI Agent 与 Headless Runtime 的深度集成。

## 2. 自愈架构 (Self-Healing Architecture)

我们致力于实现 **“生成 -> 运行 -> 验证 -> 修复”** 的全自动闭环。AI 交付的不应是“待验证的代码”，而是“已通过测试的逻辑”。

### 2.1 核心循环 (The Loop)

1.  **Generate**: AI 根据 Spec 生成 Logic Flow 和 Test Cases。
2.  **Run**: Headless Runner 在沙箱中执行逻辑，注入 Mock Service。
3.  **Verify**: 运行 Test Cases，断言 State 和 Signal 是否符合预期。
4.  **Debug**: 如果失败，将 Execution Dump (执行快照) 喂回给 AI，AI 分析 Trace 并自动修复代码。
5.  **Deliver**: 循环直至全绿，交付最终代码。

### 2.2 基础设施：`@kernel/test`

为了支撑这一愿景，我们需要构建官方测试套件 `@kernel/test`。详细设计请参考：

*   **[Logix Test Kit Design](../../runtime-kernel/test/01-test-kit-design.md)**

## 3. 全双工可视化 (Full-Duplex Visualization)

我们追求 **“图码互转，实时反馈”** 的极致体验。

### 3.1 图码互转

*   **Code -> Graph**: 实时解析 Pattern 代码，渲染为逻辑流程图。
*   **Graph -> Code**: 在画布上拖拽节点，通过 AST 变换反向修改 Pattern 源码。

### 3.2 实时调试 (Live Trace)

结合 Effect Inspector，在画布上实时展示数据流动的动画与状态快照，实现“白盒化”调试。

*   **Signal Visualization**: 将 Signal 可视化为连接线上的**脉冲数据包**。UI -> Logic 的触发信号，以及 Logic -> UI 的副作用信号，都以动画形式呈现，直观展示“副作用的传播路径”。
*   **Timeline**: 在调试面板中，以时间轴形式展示 Signal (瞬态) 和 State (持久) 的交织变化，支持时间旅行。

## 4. 资产运营网络 (Asset Network)

平台将演变为企业级的**资产共建网络**。

*   **Pattern Market**: 内部的 Pattern 市场，支持版本管理、依赖分析与热度统计。
*   **Knowledge Graph**: 建立 Spec (需求) 与 Pattern (实现) 的知识图谱，AI 可以根据历史数据推荐“最适合当前业务的 Pattern”。
