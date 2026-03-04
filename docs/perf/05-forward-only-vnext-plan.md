# 05 · Forward-Only vNext 方案（零存量用户）

本文件在“当前项目没有任何存量用户”前提下生效，作为后续性能推进的唯一主线。

## 0. 裁决前提

1. 无存量用户、无兼容包袱。
2. 目标优先级：性能上限 > 可诊断性 > API 清晰度 > 兼容性。
3. 允许破坏式 API 调整；不提供兼容层，不保留弃用期。

## 0.1 执行清单（按刀提交）

约束：每一刀必须独立提交，并在本文件与相关专题里把对应条目标记为已完成。

- [x] A-1：Devtools full 懒构造（lazy materialization）+ Trace gate（`traceMode`）的最小闭环（含回归与 perf 证据）。
- [x] A-2：externalStore full/off 方差收敛：在 `traceMode=off` 时提前 `onCommit`（避免 full 延迟 notify）。
- [ ] B-1：externalStore 写回批处理（microtask/tick window），把 “每 callback 一笔 txn” 改为窗口合并。
- [ ] C-1：`Ref.list(...)` 默认自动增量化（从 txn evidence 推导 `changedIndices`），业务侧不再要求拆 `Ref.item(...)`。
- [ ] D-1：DirtySet v2（root-level + index-level evidence 统一协议），converge/validate/selector 共用。

## 1. 目标状态（一次性收敛）

1. `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 稳定通过到 `watchers=512`。
2. list/form 默认增量化，不依赖业务层手工拆分 `Ref.item(...)`。
3. full 诊断成本受控：事件默认 `lazy materialization`，热路径只保留 slim anchor。
4. Runtime 配置语义去重：诊断配置单一入口，不再分散在多处。

## 2. API vNext（直接替换，不兼容旧形态）

### 2.1 Runtime

现状问题：
- `devtools.diagnosticsLevel` 与 `stateTransaction.instrumentation` 存在语义重叠。

vNext：
- 引入统一 `observability`。
- 删除/收敛旧的重叠配置入口。

```ts
Runtime.make(root, {
  observability: {
    level: 'off' | 'light' | 'full',
    materialization: 'lazy' | 'eager', // 默认 lazy
    bufferSize?: number,
    observer?: false | { ... },
    traitConvergeSampling?: { ... },
  },
})
```

### 2.2 StateTrait.externalStore

现状问题：
- `coalesceWindowMs` 语义弱，无法表达批处理策略。

vNext：
- 用 `writeback` 策略对象替代 `coalesceWindowMs`。
- 默认 `batched + microtask`。

```ts
StateTrait.externalStore({
  store,
  select,
  equals,
  writeback: {
    mode: 'sync' | 'batched',
    window: 'microtask' | { budgetMs: number },
    priority: 'normal' | 'low',
  },
})
```

### 2.3 TraitLifecycle.scopedValidate

现状问题：
- `Ref.list(...)` 增量化能力依赖调用方姿势。

vNext：
- 增加增量策略语义，并由内核默认自动推导。

```ts
TraitLifecycle.scopedValidate($, {
  mode: 'valueChange',
  target: TraitLifecycle.Ref.list('items'),
  incremental: 'auto' | 'forceFull', // 默认 auto
})
```

## 3. 内核改造波次（执行顺序）

### Wave A（P0）：诊断懒构造

目标：
- `full` 下 `state:update` 只产出轻锚点；重 payload 按需生成。

落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- `packages/logix-core/src/Runtime.ts`（新 `observability` 配置接线）

状态：
- [x] A-1 已完成：引入 `diagnosticsMaterialization=eager/lazy` 与 `traceMode=on/off`，并在 production + full 下默认 `lazy + trace off`；证据见 `docs/perf/2026-03-04-s2-kernel-perf-cuts.md` 的“切刀 #7”。
- [x] A-2 已完成：在 `traceMode=off` 时把 `onCommit` 提前到 `state:update` 之前以尽早 schedule tick flush；证据见 `docs/perf/2026-03-04-s2-kernel-perf-cuts.md` 的“切刀 #8”（ULW52/53/54）。

### Wave B（P0）：externalStore 批处理写回

目标：
- 同窗口多次 external callback 合并为一次 transaction + 一次 notify。

落点：
- `packages/logix-core/src/internal/state-trait/external-store.ts`
- `packages/logix-core/src/StateTrait.ts`（`writeback` API）

状态：
- [ ] 未开始

### Wave C（P1）：Ref.list 自动增量

目标：
- transaction 内沉淀 index hint，validate 直接消费。

落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/src/internal/trait-lifecycle/index.ts`

状态：
- [ ] 未开始

### Wave D（P1/P2）：DirtySet v2 统一协议

目标：
- root-level dirtySet + index-level evidence 双通道统一，供 converge/validate/selector 共用。

落点：
- `packages/logix-core/src/internal/field-path.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/state-trait/*`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

状态：
- [ ] 未开始

## 4. 破坏式变更策略（必须执行）

1. 直接移除旧 API 字段（不做 alias）。
2. 同步更新测试与 perf 基准，不保留双写。
3. 所有文档以 vNext 为唯一真相源，旧接口只在历史记录中出现。

## 5. 验收门（每波必须满足）

1. 类型与回归：
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-core test`

2. Perf 主门：
- `externalStore.ingest.tickNotify`：`full/off<=1.25` 到 `watchers=512` 稳定通过（3~5 轮 quick 中位）。

3. Perf 防回归：
- `runtimeStore.noTearing.tickNotify` 继续通过。
- `form.listScopeCheck` 继续通过。

4. 语义硬门：
- 事务窗口禁 IO。
- `instanceId/txnSeq/opSeq` 稳定不漂移。
- 诊断事件 slim + 可序列化。

## 6. Agent 接力规则

1. 新会话先读本文件，再读 `04-agent-execution-playbook.md`。
2. 若实现与本文件冲突，以本文件为准并回写其它专题文档。
3. 每个 wave 完成后新增日期记录（改动/证据/结论/下一步）。
