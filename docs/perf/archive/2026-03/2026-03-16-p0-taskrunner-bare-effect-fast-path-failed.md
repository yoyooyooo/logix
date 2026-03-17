# 2026-03-16 · P0 TaskRunner bare-effect fast path 失败结论

## 这刀做了什么

尝试给 `TaskRunner` 增加一个更窄的 bare-effect 快路径，只覆盖以下条件同时成立的任务：

- `config.pending` 为空
- `config.success` 为空
- `config.failure` 为空
- `runLatest` 的 `getCanWriteBack` 不参与

目标是跳过当前 `runTaskLifecycle(...)` 里的通用三段壳：

- `defaultOrigins`
- pending / success / failure 分支判断
- `Exit` 后的 writeback 分流

实现只触及：

- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`

当前代码已全部回退，不保留实现。

## 验证

通过的守门：

```bash
/Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run \
  packages/logix-core/test/internal/Runtime/TaskRunner.test.ts \
  packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.TaskRunnerBounded.test.ts
```

结果：

- `TaskRunner.test.ts` 通过
- `ConcurrencyPolicy.TaskRunnerBounded.test.ts` 通过

贴边 perf：

```bash
/Users/yoyo/Documents/code/personal/logix/node_modules/.bin/vitest run \
  packages/logix-core/test/internal/Runtime/TaskRunner.EffectOnlyFastPath.test.ts \
  packages/logix-core/test/internal/Runtime/TaskRunner.EffectOnlyFastPath.Perf.off.test.ts
```

关键结果：

- bare-effect 当前实现 `p95=0.006ms`
- legacy 对照 `p95=0.003ms`

结论：

- 当前切口没有打穿对照
- 至少在这条贴边 micro-bench 上，bare-effect 快路径更慢

## 当前裁决

- 不保留代码
- 只保留 docs/evidence-only
- 当前结果分类：`discarded_or_pending`

## 后续建议

若未来要重开，优先考虑两种更窄的方向：

1. 只在 `mode='task'` 做最薄快路径
2. 先看 `TaskRunner` 的 `inSyncTransactionFiber` 误用守门与 `catchCause` 诊断是否还能再拆壳

在没有新的贴边证据前，不建议继续把 bare-effect 快路径作为独立实施线。
