# Roadmap: 005 Timeline Rendering × 007 Trait System 融合

**Branch**: `005-unify-observability-protocol`
**Created**: 2025-12-14
**Status**: Active
**Related**: `specs/007-unify-trait-system/spec.md`, `design-timeline-rendering.md`

> 本文档分析 005 Timeline Rendering 设计如何与 007 Trait System 落实后的 Logix 实现融合，并给出分阶段实施路径。

---

## 1. 背景与核心问题

### 1.1 005 设计的核心目标

根据 `design-timeline-rendering.md`：

- 从 **Density Histogram**（直方图）升级为 **Time-Span Timeline**（时序跨度时间线）
- 目标是对标 Chrome DevTools Performance 面板的交互体验
- 支持 Canvas/WebGL 渲染、Brush 框选、Flamegraph 深度查看
- Off-Main-Thread 架构，避免 Observer Effect

### 1.2 007 落实后的新现实

根据 `007-unify-trait-system/spec.md` 与 `data-model.md`：

- Trait 系统引入了 **Operation Window**（单次操作窗口）概念
- 每次窗口对外保证 **0/1 次可观察提交**（FR-006）
- 引入了 **traitSummary**（收敛摘要）用于诊断（FR-011）
- **ReplayLog** 提供了 `ResourceSnapshot` 等可回放事件（FR-015）
- 诊断需要回答：触发范围、跳过原因、TopN 成本、降级原因

---

## 2. 当前实现状态

### 2.1 DebugSink 已具备的能力

`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 中的事件模型：

```typescript
// 核心事件类型
"state:update" → 包含 patchCount, originKind, originName, traitSummary, replayEvent
"diagnostic"   → 包含 code, severity, message, hint, trigger
"trace:*"      → 扩展钩子（trace:react-render, trace:effectop）
```

**已固化的关键字段位**（`state:update`）：

| 字段 | 用途 | 状态 |
|------|------|------|
| `txnId` | 事务 ID | ✅ 已实现 |
| `patchCount` | Patch 数量 | ✅ 已实现 |
| `originKind/originName` | 触发来源 | ✅ 已实现 |
| `traitSummary` | 收敛摘要（预留位） | ⚠️ 结构待固化 |
| `replayEvent` | 回放事件关联 | ⚠️ 结构待固化 |

### 2.2 ReplayLog 已具备的能力

`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`：

```typescript
type ReplayLogEvent =
  | { _tag: "ResourceSnapshot"; resourceId; fieldPath; keyHash; phase; snapshot; timestamp }
  | { _tag: "InvalidateRequest"; kind; target; meta }
```

与 007 data-model 中定义的 **ReplayEvent** 基本一致，但目前只覆盖 **Resource** 相关事件。

### 2.3 Devtools 当前实现

`packages/logix-devtools-react/src/state/compute.ts`：

1. **TraitConvergeWindow** 聚合：从 `state:update.traitSummary.converge` 提取
   - outcomes: Converged/Noop/Degraded
   - degradedReasons: budget_exceeded/runtime_error
   - top3: 最高成本的前 3 条规则

2. **OperationSummary** 分组：基于 `operationWindowMs`（默认 1000ms）切分事件窗口

3. **字段筛选**：`selectedFieldPath` 可按字段关联过滤事件

4. **Time Travel**：`timeTravel` 状态位已预留，支持前/后状态切换

---

## 3. Gap 分析

| 维度 | 005 设计要求 | 007 提供的能力 | 当前实现 | Gap |
|------|------------|---------------|---------|-----|
| **时序精度** | 每个事件的 `[start, end]` span | `StateTransaction` 提供 `startedAt/endedAt` | 事件只有 `timestamp` 点 | 🔴 缺少 span 形态 |
| **泳道模型** | Main Flow Lane + Event Signal Lane | `traitSummary.converge` + 独立事件 | 只有单一 timeline | 🔴 缺少泳道分层 |
| **因果关系** | Flow→Effect→Resource 调用栈 | `EffectOp.meta` 可挂 resourceId/keyHash | 部分解析 trace:effectop | 🟡 可扩展 |
| **Brush 交互** | 双向滑块控制视口 | `timelineRange` 已预留 | 只有范围字段，无 UI | 🟡 需 UI 实现 |
| **Canvas 渲染** | Off-Main-Thread | 设计文档建议 Worker | DOM 堆叠方式 | 🔴 需架构重构 |
| **回放对齐** | 回放按事件重赛 | ReplayLog 已具备 | 只在 source 层使用 | 🟡 需 Devtools 集成 |

---

## 4. 融合方案

### 4.1 数据模型扩展

#### 4.1.1 扩展 traitSummary 结构

**现有结构**（已部分固化）：

```typescript
traitSummary: {
  converge: {
    outcome: "Converged" | "Noop" | "Degraded"
    degradedReason?: "budget_exceeded" | "runtime_error"
    budgetMs?: number
    totalDurationMs: number
    executedSteps: number
    changedSteps: number
    top3: Array<{ stepId; kind; fieldPath; durationMs; changed }>
  }
}
```

**建议扩展**（用于 Timeline Span）：

```typescript
traitSummary: {
  converge: { /* 同上 */ }

  // NEW: Operation Window 的完整时序边界
  window?: {
    startedAt: number   // 窗口开始时间戳
    endedAt: number     // 窗口结束时间戳（= event.timestamp）
    txnId: string       // 事务 ID（已有，此处冗余便于聚合）
  }

  // NEW: 详细步骤执行日志（可选，deep 模式）
  steps?: Array<{
    stepId: string
    kind: "computed" | "link" | "source" | "check"
    target: string      // fieldPath
    deps: string[]      // 依赖字段
    startedAt: number   // 步骤开始
    endedAt: number     // 步骤结束
    changed: boolean
    skipped?: boolean   // 因等价跳过
  }>
}
```

**约束**：
- `steps` 仅在 `settings.mode === 'deep'` 时记录，避免默认开销
- `window.startedAt` 与 `window.endedAt` 必须来自 `StateTransaction`，不允许 Devtools 补造

#### 4.1.2 扩展 ReplayLog 事件类型

```typescript
type ReplayLogEvent =
  | { _tag: "ResourceSnapshot"; ... }       // 已有
  | { _tag: "InvalidateRequest"; ... }      // 已有
  // NEW: Trait 收敛事件（与 StateTransaction 对应）
  | {
      _tag: "TraitConverge"
      txnId: string
      moduleId: string
      runtimeId?: string
      outcome: "Converged" | "Noop" | "Degraded"
      degradedReason?: "budget_exceeded" | "runtime_error"
      totalDurationMs: number
      executedSteps: number
      changedSteps: number
      steps?: Array<{ stepId; kind; target; startedAt; endedAt; changed }>
      timestamp: number
    }
```

**约束**：
- 回放时 `TraitConverge` 事件用于重建 Timeline 视图，不触发实际派生执行
- `steps` 可选，仅在诊断/导出证据包时携带

### 4.2 泳道模型映射

基于 007 的语义，Timeline 采用以下泳道布局：

```
┌──────────────────────────────────────────────────────────┐
│  Operation Window Lane (顶层 Span)                        │
│  └─ 每个 StateTransaction 作为一个 Span                   │
│     └─ 颜色区分: Converged(绿) / Noop(灰) / Degraded(黄)   │
│     └─ Span 宽度 = endedAt - startedAt                   │
├──────────────────────────────────────────────────────────┤
│  Trait Execution Lane (中层 Span，可折叠)                  │
│  └─ computed/link/source/check 步骤的执行跨度             │
│     └─ 仅在 deep 模式且 steps 存在时渲染                  │
│     └─ 支持 Flamegraph 展开（按 deps 关系嵌套）            │
├──────────────────────────────────────────────────────────┤
│  Event Signal Lane (底层 Dots/Ticks)                      │
│  └─ action:dispatch / trace:react-render 等瞬时事件       │
│     └─ 密度过高时退化为 Heatmap 颜色                       │
└──────────────────────────────────────────────────────────┘
```

**泳道与 Debug.Event 的映射**：

| 泳道 | 数据来源 | 渲染形态 |
|------|---------|---------|
| Operation Window | `state:update` + `traitSummary.window` | 长条 Span |
| Trait Execution | `traitSummary.steps` | 嵌套 Span（Flamegraph） |
| Event Signal | `action:dispatch`, `trace:react-render`, `diagnostic` | Dots / Ticks |

### 4.3 Brush 交互与视口同步

**现有基础**：
- `DevtoolsState.timelineRange` 已预留 `{ start: number; end: number }`
- `OverviewStrip` 组件存在但未实现 Brush UI

**实现方案**：

1. **Overview 条带**：渲染全量时间范围的缩略图（Operation Spans + Event Dots）
2. **Brush 控件**：双边滑块，控制 `timelineRange`
3. **Detail 视图**：仅渲染 `timelineRange` 范围内的事件
4. **双向同步**：
   - 拖动 Brush → 更新 `timelineRange` → Detail 视图联动
   - 在 Detail 视图 Zoom/Pan → 反向更新 Brush 位置

### 4.4 渲染架构演进

#### Phase 1：DOM 渲染 + 泳道分层（短期）

- 保持现有 DOM 渲染方式
- 在 `OverviewStrip` 中增加 Operation Window Span 渲染
- 复用现有 `timelineRange` 实现 Brush 基础交互
- 适用场景：事件量级 < 5k

#### Phase 2：Canvas 渲染层（中期）

- `OverviewStrip` 使用 Canvas 2D API 绘制 Span + Dots
- Layering：Background Layer → Content Lane Layer → Interaction Layer
- 若暂时在主线程计算聚合/布局，仅限“低事件量验证”用途；**`FR-012` 达标路径必须以 Worker-first 为目标**（避免事件处理逻辑挤占被测页面主线程）。
- 引入 RAF Throttling：限制刷新率为 20fps

#### Phase 3：Off-Main-Thread（Worker-first）达标实现（长期，必选）

- 聚合计算移入 Web Worker
- Worker 输出：`{ spans: [], dots: [], heatmap: [] }`
- 支持 OffscreenCanvas（可选，用于进一步把绘制从主线程剥离）
- 适用场景：事件量级 ≥ 10k
  - 说明：由于 005 的 `FR-012` 以 `≥ 10k events/s` 为验收口径，本 Phase 对应“达标实现”，不应被视为可选。

---

## 5. 实施路径

### 5.1 任务分解

| Phase | 任务 | 对应 Spec 要求 | 优先级 | 工作量 |
|-------|------|---------------|--------|--------|
| **1** | 扩展 `StateTransaction` 输出 `window` 边界到 `traitSummary` | 007 FR-011 | P0 | S |
| **1** | Devtools `compute.ts` 解析 `traitSummary.window` | 005 FR-004 | P0 | S |
| **1** | `OverviewStrip` 渲染 Operation Window Span（DOM） | 005 设计 §2.2 | P0 | M |
| **1** | 实现 Brush 交互组件（双边滑块） | 005 FR-004 | P1 | M |
| **1** | Detail 视图与 Brush 双向联动 | 005 FR-004 | P1 | M |
| **2** | 扩展 `traitSummary.steps` 记录详细执行日志 | 007 FR-011 | P1 | M |
| **2** | 泳道分层 UI（Operation / Trait / Event） | 005 设计 §2.2 | P1 | M |
| **2** | Flamegraph 展开交互 | 005 设计 §5.3 | P2 | L |
| **2** | ReplayLog 增加 `TraitConverge` 事件类型 | 007 FR-015 | P2 | S |
| **3** | Canvas 渲染 `OverviewStrip` | 005 FR-012 | P2 | L |
| **3** | RAF Throttling + IdleCallback 降级 | 005 FR-013 | P2 | M |
| **3** | Off-Main-Thread Worker-first 架构（聚合/索引/布局） | 005 FR-012 | P1 | XL |

### 5.2 里程碑定义

**M1：Timeline Span 基础可用**
- [x] DebugSink 事件模型支持 traitSummary
- [ ] traitSummary.window 边界从 StateTransaction 写入
- [ ] OverviewStrip 渲染 Operation Window Span
- [ ] Brush 基础交互可用

**M2：泳道分层与深度诊断**
- [ ] traitSummary.steps 记录详细执行日志（deep 模式）
- [ ] 三泳道 UI 布局
- [ ] Flamegraph 展开交互
- [ ] TraitConverge 事件进入 ReplayLog

**M3：高性能渲染**
- [ ] Canvas 渲染 Overview
- [ ] Throttling 策略
- [ ] Worker-first 聚合/索引/布局（必选，满足 `FR-012`）
- [ ] OffscreenCanvas（可选）

---

## 6. 关键决策记录

### 6.1 traitSummary.steps 是否默认开启？

**决策**：仅在 `settings.mode === 'deep'` 时记录

**理由**：
- 开启时可视化更丰富，但增加内存开销（每步骤 ~100 bytes）
- 默认 `basic` 模式只记录 `converge` 摘要，满足 80% 场景
- 用户可在 Devtools Settings 中切换

### 6.2 ReplayLog 是否统一承接 Trait 事件？

**决策**：统一，增加 `_tag: "TraitConverge"` 类型

**理由**：
- 便于回放与证据包导出（EvidencePackage）
- 与 ResourceSnapshot 共享同一套 replay 机制
- Devtools 可基于 ReplayLog 完整重建 Timeline

### 6.3 Canvas 渲染的优先级？

**决策**：P2，视实际场景需求提升

**理由**：
- 若短期目标场景 < 5k 事件，DOM 方案可接受
- 若需要处理高频场景（10k+），则提升为 P1
- Canvas 实现可独立演进，不阻塞泳道分层功能

---

## 7. 与其他 Spec 的关联

| Spec | 关联点 | 依赖方向 |
|------|--------|---------|
| 007-unify-trait-system | `traitSummary` 结构定义 | 007 → 005 |
| 007-unify-trait-system | `ReplayLog` 事件类型 | 007 → 005 |
| 005 data-model | `ObservationEnvelope` 外壳 | 005 内部 |
| 005 spec | FR-004 核心视图、FR-012 性能要求 | 005 内部 |

---

## 8. 变更日志

| 日期 | 变更内容 | 作者 |
|------|---------|------|
| 2025-12-14 | 初始版本：Gap 分析、融合方案、实施路径 | Claude Code |
