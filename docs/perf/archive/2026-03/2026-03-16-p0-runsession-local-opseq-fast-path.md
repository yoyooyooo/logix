# 2026-03-16 · P0：runSession-local opSeq allocator fast path

## 这刀做了什么

目标只覆盖这条路径：

- `middlewareStack.length === 0`
- `runSession` 已在 runtime 构造期解析出来

实现点：

1. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `operationRunner` 构造时，只要默认 `middlewareStack` 为空，就把预解析的 `OperationRuntimeServices` 传给 `makeRunOperation(...)`

2. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- 新增 `hasEmptyOperationMiddlewareStack(...)`
- 为默认 `runSession` 预绑定一次 `runSession.local.nextSeq`
- 在 `middleware=[] + default runSession!=undefined` 时走专用快路径：
  - 不再每次调用 `resolveOperationRuntimeServices()`
  - 不再每次调用 `serviceOption(RunSessionTag)`
  - 直接分配 `opSeq`
  - 直接回填 `currentOpSeq`
  - 直接生成 link fallback id

## 语义边界

没有改：

- `ModuleRuntime.txnQueue.ts`
- `ModuleRuntime.transaction.ts`
- `StateTransaction.ts`
- 非空 middleware 路径

仍需保持：

- `opSeq` 对同一 `instanceId` 单调
- 不同 `instanceId` 不串号
- `existing linkId` 传播不变
- `txnId` 相关邻近守门不回退

## 验证

### 最小相关测试

```bash
pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts
pnpm test -- test/internal/Runtime/Runtime.OperationSemantics.test.ts
pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "should attach the same txnId to action and state events for a single dispatch"
```

结果：

- `ModuleRuntime.operationRunner.FastPath.test.ts`: `3 passed`
- `Runtime.OperationSemantics.test.ts`: `4 passed`
- `ModuleRuntime.test.ts -t txnId`: `1 passed | 45 skipped`

### 最小 typecheck

```bash
pnpm typecheck:test
```

结果：

- `packages/logix-core`: 通过

### 贴边 micro-bench

命令：

```bash
LOGIX_PERF_ITERS=1000 LOGIX_PERF_WARMUP=100 pnpm exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.Perf.off.test.ts --testTimeout=20000
```

输出：

- `batch=256`
  - `fast.avg=0.402ms`
  - `legacy.avg=0.859ms`
  - `speedup=2.137x`
  - `saved=53.21%`
- `batch=1024`
  - `fast.avg=1.651ms`
  - `legacy.avg=3.397ms`
  - `speedup=2.057x`
  - `saved=51.38%`

## 结论

- `accepted_with_evidence`

这刀有硬收益，且相邻语义守门继续通过，可以保留代码并提交。
