# 2026-03-16 · P1 onCommit scheduler minimal envelope

## 这刀做了什么

目标只打 `ModuleRuntime.impl.ts` 里 `onCommit -> scheduler.onModuleCommit(...)` 这一小段。

实现：
- `diagnostics=off` 时，不再为 scheduler 路径读取 `currentOpSeq`
- `diagnostics=off` 时，不再拼 `schedulingPolicy` 诊断包
- 语义保持：
  - `tickSeq` 推进不变
  - module/readQuery 订阅更新不变
  - diagnostics 打开时原行为保持不变

主改文件：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.Perf.off.test.ts`

## 验证

通过：
- `vitest run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.Perf.off.test.ts`

语义结论：
- `diagnostics=off + readQuery subscriber` 仍能收到更新
- `diagnostics=light + module topic subscriber` 仍能正常推进 tick

当前实现 perf：
- module:
  - `dispatchOnly.avg=0.075ms`
  - `dispatchOnly.p50=0.067ms`
  - `dispatchOnly.p95=0.110ms`
  - `settle.avg=0.996ms`
  - `settle.p95=1.072ms`
- readQuery:
  - `dispatchOnly.avg=0.067ms`
  - `dispatchOnly.p50=0.061ms`
  - `dispatchOnly.p95=0.096ms`
  - `settle.avg=0.988ms`
  - `settle.p95=1.049ms`

baseline `b3a74db5` 对照：
- module:
  - `dispatchOnly.avg=0.078ms`
  - `dispatchOnly.p50=0.067ms`
  - `dispatchOnly.p95=0.121ms`
  - `settle.avg=1.030ms`
  - `settle.p95=1.142ms`
- readQuery:
  - `dispatchOnly.avg=0.080ms`
  - `dispatchOnly.p50=0.073ms`
  - `dispatchOnly.p95=0.113ms`
  - `settle.avg=1.014ms`
  - `settle.p95=1.122ms`

相对变化：
- module:
  - `dispatchOnly.avg`: `0.078ms -> 0.075ms`
  - `dispatchOnly.p95`: `0.121ms -> 0.110ms`
  - `settle.avg`: `1.030ms -> 0.996ms`
  - `settle.p95`: `1.142ms -> 1.072ms`
- readQuery:
  - `dispatchOnly.avg`: `0.080ms -> 0.067ms`
  - `dispatchOnly.p95`: `0.113ms -> 0.096ms`
  - `settle.avg`: `1.014ms -> 0.988ms`
  - `settle.p95`: `1.122ms -> 1.049ms`

### 母线复验

母线回收提交：

- `f41a7b89` `perf(runtime): tighten oncommit scheduler envelope`

当前母线再次执行：

```sh
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.onCommitSchedulerEnvelope.Perf.off.test.ts

python3 fabfile.py probe_next_blocker --json
```

结果：

- 三个 `logix-core` 最小相关 test files 继续通过
- 当前母线 perf 记录值：
  - module：`dispatchOnly.avg=0.134ms`，`dispatchOnly.p95=0.243ms`，`settle.avg=1.108ms`，`settle.p95=1.661ms`
  - readQuery：`dispatchOnly.avg=0.130ms`，`dispatchOnly.p95=0.218ms`，`settle.avg=1.062ms`，`settle.p95=1.250ms`
- `probe_next_blocker --json` 继续返回：
  - `status: "clear"`
  - `blocker: null`
  - `pending: []`

说明：

- 这条 perf test 目前是记录型证据，不直接与 baseline 做自动断言
- 当前母线复验的价值在于确认语义守门继续通过，且合入后没有把 current-head 带回 blocker 状态

## 结论

这刀满足当前母线的合入门槛。

原因：
- `diagnostics=off + module subscriber` 和 `diagnostics=off + readQuery subscriber` 两条目标路径都拿到了正向对照
- 语义守门全绿
- `diagnostics=light` 守门没有回退

裁决：
- `accepted_with_evidence`
