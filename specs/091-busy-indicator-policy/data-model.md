# Data Model: 091 Busy Indicator Policy

> 本文件定义 091 的关键实体与状态机，用于实现阶段对齐默认参数、测试断言与可访问语义。

## Entities

### BusyPolicy

- `delayMs: number`（默认 `150`）
- `minDurationMs: number`（默认 `300`）
- `allowNested?: boolean`（默认 `false`；祖先 busy 可见时抑制子 busy UI）

### BusySource（事实源）

busy 事实源只允许来自框架可解释的 pending 信号：

- ActionRun pending（来自 088）
- Resource pending（来自 090）

> 禁止：业务自管布尔作为唯一事实源（避免并行真相源与 tearing 风险）。

### BusyBoundaryState

- `visible: boolean`
- `pendingCount: number`（聚合）
- `firstPendingAtMonoMs?: number`（单调时钟）
- `visibleSinceMonoMs?: number`（单调时钟）
- `suppressedByAncestor?: boolean`（仅影响 UI 展示，不改变聚合事实）

## State Machine（最小）

```
idle
  └─ pendingCount>0 → waiting(delay)
waiting(delay)
  ├─ pendingCount=0（delay 内结束）→ idle（不显示）
  └─ delay 到期且 pendingCount>0 → visible(minDuration)
visible(minDuration)
  ├─ pendingCount>0 → visible（持续）
  └─ pendingCount=0 且已满足 minDuration → idle（隐藏）
```

## Accessibility（最小门槛）

- BusyBoundary 在 `visible=true` 时默认设置容器 `aria-busy=true`（并在隐藏时恢复）。
- Action Props 组件在 pending 时提供禁用态/可感知状态，但不得制造屏幕阅读器噪音风暴（避免频繁 aria-live 更新）。

