# 2026-03-16 · P0-2 existing-link inline operation fast path

## 这刀做了什么

目标只覆盖 `runOperation(...)` 的一条窄路径：

- `middlewareStack.length === 0`
- 当前 Fiber 已经带有 `existingLinkId`

实现只落在：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`

核心变化：

1. 新增 `assignInlineFastPathOpSeq(...)`
- 在不构造完整 `baseMeta` 的前提下，只按现有语义读取：
  - 显式 `meta.opSeq`
  - 或 `runSession.local.nextSeq('opSeq', instanceId)`

2. 为 `existingLinkId + middleware=[]` 提前 inline 返回
- 直接把 `currentOpSeq/currentLinkId` 注入到 `eff`
- 跳过这条路径上的：
  - `baseMeta` 组装
  - `EffectOp.make(...)`

3. 没有改：
- `ModuleRuntime.transaction.ts`
- `ModuleRuntime.txnQueue.ts`
- `StateTransaction.ts`
- 非空 middleware 路径

## 先钉死的语义

新增 RED 守门在 `ModuleRuntime.operationRunner.FastPath.test.ts`，明确写死：

1. `existingLinkId + middleware=[] + 无 runSession + 无显式 opSeq`
- `currentOpSeq === undefined`
- `currentLinkId === existingLinkId`
- 不应再调用 `EffectOp.make`

2. `existingLinkId + middleware=[] + 动态 runSession`
- `currentOpSeq` 继续按 `runSession.local.nextSeq(...)` 分配
- `currentLinkId` 继续复用 `existingLinkId`
- 不应再调用 `EffectOp.make`

## RED

命令：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts
```

在当前 HEAD 下先失败，失败原因明确：

- 新增的两个测试都命中正确语义
- 失败点只有 `EffectOp.make` 仍被调用
  - 无 runSession 场景：`1` 次
  - 动态 runSession 场景：`2` 次

这说明测试没有写偏，确实钉住了“剩余壳税”的位置。

## GREEN 与验证

### 最小相关测试

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts test/internal/Runtime/Runtime.OperationSemantics.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Flow/FlowRuntime.test.ts -t "run/runParallel/runLatest/runExhaust should skip opSeq allocation when middleware stack is empty"
```

结果：

- `ModuleRuntime.operationRunner.FastPath.test.ts`: `5 passed`
- `Runtime.OperationSemantics.test.ts`: `4 passed`
- `FlowRuntime.test.ts` 贴边守门：`1 passed`

### 类型门

```bash
pnpm -C packages/logix-core typecheck:test
```

结果：

- `packages/logix-core`: 通过

## perf 证据

### 现有 broad runner perf

命令：

```bash
LOGIX_PERF_ITERS=1000 LOGIX_PERF_WARMUP=100 pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.Perf.off.test.ts --testTimeout=20000
```

输出：

- `batch=256`: `fast.avg=0.414ms`, `legacy.avg=0.907ms`, `speedup=2.191x`
- `batch=1024`: `fast.avg=1.667ms`, `legacy.avg=3.631ms`, `speedup=2.178x`

解释：

- 这条 bench 的 legacy 侧虽然带了 `existingLinkId`，但仍背着 `resolveOperationRuntimeServices()` 的解析成本
- 本刀砍掉的是 `EffectOp.make/baseMeta` 这层壳税
- 在这个 broad bench 里，收益被更大的 runtime-service 解析成本淹没，不能单独证明这刀

### 新增贴边 micro-bench

新增：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.ExistingLinkInline.Perf.off.test.ts`

命令：

```bash
LOGIX_PERF_ITERS=1500 LOGIX_PERF_WARMUP=150 pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.ExistingLinkInline.Perf.off.test.ts --testTimeout=20000
```

输出：

- `batch=1024`: `inline.avg=1.130ms`, `fallback.avg=1.201ms`, `speedup=1.064x`, `saved=5.98%`
- `batch=4096`: `inline.avg=4.694ms`, `fallback.avg=4.879ms`, `speedup=1.039x`, `saved=3.78%`

解释：

- 这条 bench 只比较：
  - `existingLinkId` 已存在，可走 inline
  - `existingLinkId` 缺失，必须回退到 `EffectOp.make`
- 两个 batch 都是稳定正向
- 收益不大，但它直接命中本刀移除的剩余外壳，证据比 broad runner perf 更贴边

## 结论

- 结果分类：`accepted_with_evidence`

理由：

1. 语义边界已经被 RED 测试钉死，并在 GREEN 后保持通过
2. 改动面只在 `ModuleRuntime.operation.ts`
3. 贴边 micro-bench 对目标路径给出了稳定正向收益
4. broad runner perf 没有明显变化，说明这刀只解决了壳税中的一个窄切面，没有夸大收益
