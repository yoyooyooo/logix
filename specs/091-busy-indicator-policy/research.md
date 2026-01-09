# Research: 091 Busy Indicator Policy

## Decision: busy 事实源来自 ActionRun/Resource，而非业务布尔

**Chosen**: busy 的输入只允许来自框架层可解释的 pending 信号（ActionRun/Resource），BusyBoundary 只负责聚合与节奏控制。

**Rationale**:

- 业务布尔不可解释、不可回放、不可统一门禁；会导致并行真相源与 tearing 风险。

## Decision: 先固化“节奏策略”，视觉样式后置

**Chosen**: 先交付 delay/minDuration/去重调度/嵌套裁决等行为规则与测试；视觉样式（spinner/skeleton/遮罩）不作为门槛。

**Rationale**:

- “闪不闪、乱不乱”是可验收的行为；样式易迭代且依赖设计系统，先解耦。

## Decision: 默认参数 delay=150ms / minDuration=300ms

**Chosen**: 默认 `delay=150ms`、`minDuration=300ms`；后续如需校准，通过示例与测试收敛（输入/提交/导航/后台刷新分别覆盖），但默认值保持稳定以便形成共同心智模型。

## Decision: 嵌套边界默认“外层可见优先”

**Chosen**: 若祖先 BusyBoundary 已处于 busy-可见状态，子 BusyBoundary 默认抑制 busy UI（避免重复/过度反馈）；需要局部提示时，必须显式开启嵌套展示选项。
