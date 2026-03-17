# 2026-03-16 · P1 `$.state.update` 顶层 key dirty evidence

## 这刀做了什么

目标只打 `$.state.update((prev) => next)` 这条 whole-state 写回路径：

- 当 `prev` 和 `next` 都是可追踪的 plain object
- 且变更可收敛到顶层 key

时，不再直接落 `'*'`，改成记录顶层 key 级 dirty evidence。

真正无法判定的情况继续保留旧路径：

- array / list root
- 不可追踪 key
- 其它无法安全收敛的对象形态

改动落点：

- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts`
- `packages/logix-core/test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts`

## 语义验证

通过：

```bash
NODE_PATH=/Users/yoyo/Documents/code/personal/logix/node_modules /Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts
```

关键断言：

- `$.state.update` 现在会把 `dirtyAll=true` 收紧到 `dirtyAll=false`
- `rootCount=1`
- `executedSteps=1`
- `skippedSteps=1`

## 贴边 perf

通过：

```bash
NODE_PATH=/Users/yoyo/Documents/code/personal/logix/node_modules /Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run packages/logix-core/test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

结果：

- `single`
  - `legacy.p50=0.093ms`
  - `legacy.p95=0.196ms`
  - `legacy.avg=0.127ms`
  - `current.p50=0.064ms`
  - `current.p95=0.104ms`
  - `current.avg=0.072ms`
- `eight`
  - `legacy.p50=0.066ms`
  - `legacy.p95=0.096ms`
  - `legacy.avg=0.079ms`
  - `current.p50=0.057ms`
  - `current.p95=0.100ms`
  - `current.avg=0.069ms`
- `many`
  - `legacy.p50=0.060ms`
  - `legacy.p95=0.094ms`
  - `legacy.avg=0.070ms`
  - `current.p50=0.064ms`
  - `current.p95=0.098ms`
  - `current.avg=0.073ms`

解释：

- `single` 明确更好
- `eight` 的 `p50/avg` 更好，`p95` 接近持平
- `many` 基本持平，小幅噪声级波动

## 邻近守门

通过：

```bash
NODE_PATH=/Users/yoyo/Documents/code/personal/logix/node_modules /Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

结果：

- `dispatch.p50=0.106ms`
- `dispatch.p95=0.314ms`
- `residual.avg=0.098ms`

当前没有看到灾难性回退。

## 类型门

命令：

```bash
node /Users/yoyo/Documents/code/personal/logix/node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 失败
- 失败点仍是仓库级既有类型噪声和依赖解析问题
- 没有新增指向本刀改动文件的独立类型错误结论

## 裁决

结论：保留，建议合入 `v4-perf`。

原因：

1. 语义红测已转绿
2. `single` 顶层 key 写回拿到明确正收益
3. `eight / many` 没有出现足够大的负向回退
4. 邻近 dispatch shell 守门无明显灾难性回退

当前结果分类：

- `accepted_with_evidence`
