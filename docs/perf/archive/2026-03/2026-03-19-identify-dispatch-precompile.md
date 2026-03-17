# 2026-03-19 · P2-2 DispatchPlan 预编译方向识别（read-only）

## 范围与输入

- 本文只做识别，不做实现。
- 参考：
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `docs/perf/archive/2026-03/2026-03-11-dispatch-shell-fixed-tax-probe.md`
  - `docs/perf/archive/2026-03/2026-03-19-identify-runtime-shell.md`
- 代码落点核对：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

## 当前事实压缩

1. `P2-2` 的目标与已有证据一致：把 dispatch 热路径里的解释成本前移到安装期。
2. 当前 dispatch 仍有明显“每次动态计算”：
   - `analyzeAction` 每次做 `_tag/type` 归一化与 `originOp` 字符串判定。
   - 每次 dispatch 都做 topic target 解析与 fanout 分组；batch 还要做 `groupTopicBatches` 聚合。
   - reducer 与 writeback 执行入口按 tag 动态查找，和 late registration 语义耦合。
3. `2026-03-11` 证据已排除多项小税点，residual 仍存在。`P2-2` 属于可独立试探的 future cut。

## Top2 题目

### 题目 1（优先级 1）

`DispatchPlan-A`：Action 解析与 topic fanout 预编译

切面：
- 在模块安装期基于 `declaredActionTags + actionTagHubsByTag` 构建静态 plan 表。
- dispatch 时只做 O(1) 计划命中，避免重复做：
  - `_tag/type` 归一化
  - `originOp` 推导
  - primary/secondary topic hub 解析
  - batch 时按 topic 的 Map 聚合构建
- 动态 action 走 fallback 解释路径，维持行为兼容。

正面收益：
- 命中 `dispatch/dispatchBatch/dispatchLowPriority` 全入口。
- 对高频单 action 和批量 action 都能减少解释壳。
- 与现有 `P0-1/P0-2` 方向正交，可叠加。

反面风险：
- `_tag/type` 双通道 OR 语义与 dedupe 语义要求严格守住。
- declared actions 与 runtime 动态 action 混跑时，plan miss 频率可能稀释收益。
- pressure diagnostics 的 `source` 字段构造位置变化，存在可观测性漂移风险。

API 变动判断：
- 预期不需要公开 API 变动。
- 内部可能新增 DispatchPlan 结构与 fallback 计数诊断字段。

最小验证命令：
```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "dispatchBatch fan-out|actionsByTag\\$ should keep _tag/type OR semantics|actionsByTag\\$ should dedupe duplicated _tag/type topic fanout"
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts -t "dispatchBatch|topic pressure"
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

### 题目 2（优先级 2）

`DispatchPlan-B`：Reducer/Writeback 执行计划化（按 actionTag 预绑定执行链）

切面：
- 安装期生成 `actionTag -> reducer/writeback pipeline` 计划。
- dispatch 时直接执行预绑定链，减少 map 查找与分支拼装。
- 为 late registration 保留可控降级路径：
  - 方案 A：setup 结束后 seal，超时注册直接失败。
  - 方案 B：seal 后动态注册进入 side table，命中率计数，后续再裁决是否收紧。

正面收益：
- 可继续降低 dispatch 事务体内解释成本。
- 为后续更深的计划化基础设施提供统一入口。

反面风险：
- 会触碰 late registration 语义，是这条线最大风险。
- 与 reducer duplicate/late registration 错误语义强耦合，回归面较大。
- 若计划失效策略设计不清楚，p95 可能劣化。

API 变动判断：
- 内部实现可先不改公开 API。
- 若选择 setup 后强 seal，可能需要 forward-only 的行为收紧说明。

最小验证命令：
```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "ReducerLateRegistrationError|ReducerDuplicateError|dispatch path"
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

## 唯一建议下一线

建议只开 `DispatchPlan-A`（Action 解析与 topic fanout 预编译）。

理由：
1. 收益面最宽，直接覆盖 dispatch 三入口与 batch fanout。
2. 风险可控，主要在路由与诊断字段一致性，语义边界清晰。
3. 对公开 API 零侵入，便于先拿到纯内部证据。
4. 可与现有 residual 识别链路直接对齐，最适合作为 `P2-2` 第一刀。

## 是否建议后续开实施线

- 建议：`是`
- 数量：`1` 条
- 顺序：先 `DispatchPlan-A`，`DispatchPlan-B` 作为二号候选。
