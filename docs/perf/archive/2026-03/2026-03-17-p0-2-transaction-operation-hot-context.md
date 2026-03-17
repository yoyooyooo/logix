# 2026-03-17 · P0-2 第三刀：transaction / operation 共享 hot context

## 目标

只做 `P0-2` 的一刀下沉：

- 把普通 transaction 内 commit `state:update` 还会重复读取的 operation 热上下文继续下沉
- 范围只覆盖普通 transaction 与 `runOperation(...)` 的共享 hot context
- 优先收敛：
  - `RunSession`
  - `middlewareStack`

本刀明确不碰：

- `txnQueue`
- `RuntimeStore`
- `TickScheduler`
- deferred worker 行为
- 对外 API

## RED

新增守门：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts`

RED 命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts
```

当前 `HEAD` 下先失败，失败原因明确：

1. `operationRunner.FastPath`
   - active transaction 上已经有人为预置的 `operationRuntimeServices`
   - `runOperation(...)` 仍未优先复用它
   - 结果 `currentOpSeq` 仍是 `undefined`，断言期望 `1`
2. `transaction.HotSnapshot`
   - runtime 先预热后再注入动态 `RunSession`
   - transaction 入口没有重新捕获 operation hot context
   - commit `state:update` 没有触发 `runSession.local.nextSeq('opSeq', ...)`

这两个失败点共同说明：

- ordinary transaction 和 operation 之间还没有共享 operation 热上下文
- `RunSession` 仍会在 transaction 内部丢失

## 实现

代码落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`

实现点：

1. `runWithStateTransaction(...)` 在 transaction 入口额外捕获一次 `resolveOperationRuntimeServices()`
   - 结果只挂到 active transaction state
   - 没有扩散进 `TxnHotSnapshot` 或 deferred worker snapshot
2. `makeRunOperation(...)` 新增 `readHotOperationRuntimeServices()`
   - active transaction 上若已有 `operationRuntimeServices`，优先复用
   - 否则退回原有 `defaultRuntimeServices` / env resolve 逻辑
3. 当 active transaction 已携带空 middleware + runSession 时
   - `runOperation(...)` 可直接走 hot fast path
   - 不再在 transaction 内部重新解析 env

## 验证

### 相关回归

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.HotSnapshot.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts \
  test/internal/Runtime/Runtime.OperationSemantics.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/observability/TxnLaneEvidence.Schema.test.ts
```

结果：

- `6` 个文件全部通过
- `17` 个测试全部通过

### 类型门

```bash
pnpm -C packages/logix-core typecheck:test
```

结果：

- 通过

## targeted perf

新增贴边 micro-bench：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts`

测量口径：

- same-code A/B，对比的是策略，不是两个 worktree
- `shared`
  - active transaction 已挂 `operationRuntimeServices`
- `fallback`
  - 只有 env 里的 `RunSession + middleware=[]`
  - runner 每次自己解析
- `diagnostics=off`
- `middleware=[]`
- active transaction
- `currentLinkId=undefined`
- 目标路径：transaction 内 commit `state:update` 的 operation 壳税

命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts \
  --testTimeout=20000
```

结果：

- `batch=256`
  - `shared.avg=0.703ms`
  - `fallback.avg=1.031ms`
  - `speedup=1.467x`
  - `saved=31.83%`
  - `shared.p95=0.820ms`
  - `fallback.p95=1.269ms`
- `batch=1024`
  - `shared.avg=3.002ms`
  - `fallback.avg=5.403ms`
  - `speedup=1.800x`
  - `saved=44.44%`
  - `shared.p95=3.194ms`
  - `fallback.p95=10.254ms`

解释：

- 这条 bench 直接命中“transaction 已捕获 hot context，operation 继续读它”这一切面
- `shared` 侧把 env 解析和后续一层 operation 外壳一起收掉
- 两个 batch 都是稳定正向，且高 batch 下收益更明显

## 结论

分类：

- `accepted_with_evidence`

理由：

1. RED 先失败，失败点直接命中 transaction / operation 之间缺少共享 hot context
2. 实现范围只落在 `ModuleRuntime.transaction.ts` 与 `ModuleRuntime.operation.ts`
3. 相关行为回归与类型门全绿
4. targeted perf 对目标路径给出稳定正向收益
