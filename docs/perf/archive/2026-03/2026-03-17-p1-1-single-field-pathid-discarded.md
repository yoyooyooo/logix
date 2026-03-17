# 2026-03-17 · P1-1 single-field pathId 直写链试验

## 切口

本轮只试最小切口：

- dispatch reducer 的单字段 path
- externalStore single-field 的单字段 path

目标是让这两条链在进入 `StateTransaction.recordPatch` 前尽量直接写入 `FieldPathId`，不做全量 reducer sink path 预编译，也不扩到 `RuntimeStore`、`TickScheduler`、operation hot context、对外 API。

## RED

先补了两条守门测试，再在当前 HEAD 下验证失败：

### dispatch reducer

命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts \
  -t "dispatch reducer single-field sink should forward pathId to StateTransaction.recordPatch"
```

失败摘要：

- 断言期望 `0`
- 实际收到 `['value']`

说明：

- 当前 reducer 单字段 patch 仍以数组路径进入 `StateTransaction.recordPatch`
- 没有走 number `pathId`

### externalStore single-field

命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  -t "single-field shallow writeback should forward pathId to StateTransaction.recordPatch"
```

失败摘要：

- 断言期望 `0`
- 实际收到 `['value']`

说明：

- 当前 externalStore single-field writeback 也仍以数组路径进入 `StateTransaction.recordPatch`

## 试了什么

实验代码只改了：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

实验思路：

1. 给单字段 string / array path 增加 side-effect free 的 `FieldPathId` 直写快路
2. reducer sink 优先把单字段 path 变成 number
3. externalStore single-field 在 runtime wrapper 前尝试把单字段 path 变成 number

## 语义验证

实验实现期间，以下守门通过：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts \
  -t "recordPatchId|pathId"

pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/StateTransaction.recordPatchArrayFast.test.ts

pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  -t "single-field shallow writeback should not re-parse fieldPath at runtime|single-field shallow writeback should forward pathId to StateTransaction.recordPatch"
```

dispatch 邻近守门：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

输出：

- `dispatch.p50=0.083ms`
- `dispatch.p95=0.155ms`
- `residual.avg=0.068ms`

类型门：

```bash
pnpm -C packages/logix-core typecheck:test
```

结果：

- 通过

## 贴边 perf

为了做同代码可比 A/B，实验期间新增了一个 reducer single-field micro-bench，做法是在同一份代码里 mock 掉 `resolveKnownSingleFieldPathId`，对比 fast-path on/off。

关键结果：

- 第一版
  - `fast.p95=0.143ms`
  - `slow.p95=0.095ms`
  - `ratio=1.5066`
- 去掉 reducer wrapper 二次解析后重跑
  - `fast.p95=0.136ms`
  - `slow.p95=0.068ms`
  - `ratio=1.9927`

结论：

- dispatch reducer 的 single-field pathId 直写链在这轮实现里稳定更慢
- 这不是“收益不明显”，是明确负收益

补充邻近样本：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts
```

本轮样本里：

- `single-shallow ratio=0.8376`
- `single-deep ratio=0.8874`
- `single-same-value-noop ratio=0.5367`
- `multi-2 ratio=1.2224`

该测试本次直接失败在 `multi-2`，因此它不能为本轮 pathId 直写链提供可接受的正证据。

## 裁决

- 结果分类：`discarded_or_pending`
- 当前裁决：不保留实验代码，只保留 docs/evidence-only

原因：

1. reducer single-field pathId 直写链有明确负收益
2. externalStore 本轮只有语义守门，没有拿到本轮变更对应的硬正收益证据
3. 现有 externalStore 单字段 perf 样本本次还出现了 `multi-2` 邻近失败，证据不够硬

## 后续如果重开

只建议考虑两条更窄的方向：

1. externalStore single-field 的一次性预取 `FieldPathId`
   - 前提是 pathId 只算一次，后续 writeback 复用
   - 先做单独 A/B，再决定是否进代码
2. reducer 侧不要再做运行时“动态识别单字段 path 再转 id”
   - 当前证据已经显示这条线在 dispatch 热路上得不偿失

## 本轮落盘

已完成：

- `docs/perf/archive/2026-03/2026-03-17-p1-1-single-field-pathid-discarded.md`

待完成：

- 无
