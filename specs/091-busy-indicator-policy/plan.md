# Implementation Plan: 091 Busy Indicator Policy（延迟/最短/防闪烁）

**Branch**: `091-busy-indicator-policy` | **Date**: 2026-01-10 | **Spec**: `specs/091-busy-indicator-policy/spec.md`  
**Input**: Feature specification from `specs/091-busy-indicator-policy/spec.md`

## Summary

目标：把 busy 指示的节奏控制（delay/minDuration 等）收敛到框架层，提供 Busy Boundary/Action Props 等接入点，使业务不再手写计时器，并避免闪烁与过度反馈。

## Deepening Notes

- Decision: 默认 `delay=150ms`、`minDuration=300ms`（source: `specs/091-busy-indicator-policy/spec.md` Clarifications）
- Decision: BusyBoundary 聚合 action/resource pending，并按 delay/minDuration 状态机裁决（source: `specs/091-busy-indicator-policy/spec.md` Clarifications）
- Decision: 嵌套边界默认“外层可见优先”（祖先 busy 可见时抑制子 busy UI）（source: `specs/091-busy-indicator-policy/spec.md` Clarifications）
- Decision: 默认不新增导出级 runtime 事件（复用 action/resource 链路）（source: `specs/091-busy-indicator-policy/spec.md` Clarifications）
- Decision: 最小可访问语义为门槛（`aria-busy` 等）（source: `specs/091-busy-indicator-policy/spec.md` Clarifications）

## Dependencies

- 依赖：`specs/088-async-action-coordinator/`（busy 的事实源来自 ActionRun pending/settle）
- 相关：`specs/090-suspense-resource-query/`（资源 pending 也应被 busy 聚合）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `@logixjs/react`、React、`effect` v3（用于可注入 config/clock）  
**Storage**: N/A  
**Testing**: Vitest（组件行为测试 + 必要的时间语义测试）  
**Target Platform**: modern browsers（headless）  
**Project Type**: pnpm workspace  
**Performance Goals**: busy 策略不得引入计时器风暴；默认开销接近零；在高频 pending 下仍可去重调度  
**Constraints**: 不破坏 React 无 tearing；可访问性（aria）为默认门槛；forward-only  
**Scale/Scope**: 最小交付：BusyPolicy + BusyBoundary + 与 action/resource pending 的聚合；样式可后续迭代

## Constitution Check

_GATE: Busy 策略属于体验关键路径，必须可预测、可访问、且不引入计时器风暴。_

- 事实源：busy 必须来自 ActionRun/Resource 的 pending（不接受业务自管布尔作为唯一事实源）。
- 无 tearing：busy 的读写必须锚定同一快照；不得出现同一 commit “busy 显示但实际已 settle”的撕裂组合。
- 计时器可控：同一 boundary 内必须去重调度；避免每个订阅者各自 setTimeout。
- 可访问性：默认实现必须提供最小 aria 语义（例如 `aria-busy`），且不破坏输入/焦点。
- 文档：对外心智模型（≤5 关键词）与默认参数必须写清，避免业务重复造轮子。

### Gate Result (Pre-Implementation)

- PASS（spec 固化 delay/minDuration 等门槛；实现必须补齐自动化测试）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- N/A（本特性主要是 UX 策略与 React 层调度；不触及 Logix core 热路径）
- 但仍需：至少补齐 browser-level 回归防线（busy 调度不会导致高频 setTimeout/raf 风暴），可在 092 的 E2E trace 里复用采样指标

## Project Structure

### Documentation (this feature)

```text
specs/091-busy-indicator-policy/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── README.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-react/src/
├── internal/busy/BusyPolicy.ts (new)
├── internal/busy/BusyBoundary.tsx (new)
└── internal/hooks/useBusy.ts (new; 聚合 action/resource pending)

packages/logix-react/test/
└── BusyBoundary.*.test.tsx (new; 覆盖 delay/minDuration/并发/嵌套)

apps/docs/content/docs/guide/advanced/
└── busy-indicator.md (new; 默认参数与用法)

examples/logix/src/scenarios/
└── busy-indicator/ (new demo)
```

**Structure Decision**:

- BusyPolicy 作为纯函数/纯配置优先（便于测试与推导）；BusyBoundary 只负责聚合与调度（去重计时器）。

## Complexity Tracking

无（若后续引入复杂动画/view transition，需另立 spec 并给出可比证据）
