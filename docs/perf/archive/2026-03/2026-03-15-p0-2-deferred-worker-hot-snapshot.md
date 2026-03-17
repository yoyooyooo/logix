# 2026-03-15 · P0-2 第一刀：deferred worker HotSnapshot

## 目标

只做 `P0-2` 的第一小刀：

- 当 transaction 决定启用 deferred converge 并唤起 worker 时
- 把 deferred worker 后续反复读取的热配置一次性快照下来
- 后续 slice 循环直接消费这份 snapshot

本刀不碰：

- `txnQueue` 边界壳
- `runOperation` 统一快照层
- `concurrencyPolicy / txnLanePolicy / traitConvergeConfig` 的实现文件

## 实现

代码落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

实现点：

1. 在 transaction 决定开启 deferred worker 时，捕获 `DeferredWorkerHotSnapshot`
   - `runtimeLabel`
   - `diagnosticsLevel`
   - `debugSinks`
   - `overrides`
   - `resolvedTxnLanePolicy`

2. deferred worker 的等待环和执行环不再重复调用 `resolveTxnLanePolicy()`

3. deferred worker 在单轮执行时，用一次 `runWithHotSnapshot(...)` 包住整段 slice 循环
   - 避免每个 slice / 每次 lane evidence 都重新拼 `provideService(...)` 外壳

## 验证

通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts
pnpm --dir packages/logix-core test -- --run test/StateTrait/StateTrait.Converge.TimeSlicing.DefaultOff.test.ts test/StateTrait/StateTrait.Converge.TimeSlicing.test.ts
pnpm --dir packages/logix-core typecheck:test
```

覆盖含义：

- `ModuleRuntime.TimeSlicing.Lanes`
  - 确认 deferred flush 不阻塞 urgent transaction
- `ModuleRuntime.TxnLanes.Overrides`
  - 确认 `forced_sync / forced_off` 仍生效
- `TxnLaneEvidence.Schema`
  - 确认 lane evidence 序列化结构不漂
- `StateTrait.Converge.TimeSlicing.*`
  - 确认 default-off 与常规 time-slicing 行为不回退

## targeted 证据

口径：

- 当前实现：本分支当前代码
- 对照基线：`v4-perf@60c5fed1`
- 同一台机器
- 同一份依赖
- 同一条 ad-hoc 脚本
- 场景：`diagnostics=off`、`traitConvergeTimeSlicing.enabled=true`、`txnLanes.enabled=true`、`512` 个 deferred computed steps
- 指标：从一次 `runWithStateTransaction(... set a)` 开始，到最后一个 deferred 字段收敛完成的总耗时

当前实现，3 轮：

- run1: `p50=39.144ms`, `p95=43.930ms`, `avg=40.519ms`
- run2: `p50=38.578ms`, `p95=43.785ms`, `avg=39.630ms`
- run3: `p50=39.127ms`, `p95=44.217ms`, `avg=40.243ms`

基线 `60c5fed1`，3 轮：

- run1: `p50=39.961ms`, `p95=44.659ms`, `avg=41.466ms`
- run2: `p50=39.171ms`, `p95=49.740ms`, `avg=41.352ms`
- run3: `p50=39.626ms`, `p95=46.328ms`, `avg=40.826ms`

中位对比：

- `p50`: `39.626ms -> 39.127ms`
- `p95`: `46.328ms -> 44.217ms`
- `avg`: `41.352ms -> 40.243ms`

## 结论

这刀方向成立。

当前证据说明：

1. 语义守门全绿
2. `typecheck:test` 通过
3. deferred flush 内环的 targeted 对照是正向的
4. 收益量级不大，但命中的是内环重复壳税

当前裁决：

- 建议合入 `v4-perf`
- 这条可以算作 `accepted_with_evidence`

## 下一步

如果继续沿 `P0-2` 往下砍，顺序建议是：

1. `runOperation` empty-default fast snapshot
2. 再看是否要把同类 snapshot 模式推广到其它 hot shell
