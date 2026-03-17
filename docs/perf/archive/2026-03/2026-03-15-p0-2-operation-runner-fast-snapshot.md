# 2026-03-15 · P0-2 第二刀：runOperation empty-default fast snapshot

## 这刀做了什么

目标只做 `P0-2` 的第二个最小切面：

- 当默认 `OperationRuntimeServices` 为空
  - `middlewareStack=[]`
  - `runSession=undefined`
- 且当前调用落在默认空路径时

让 `runOperation(...)` 直接消费初始化阶段捕获的空快照，跳过每次调用里的：

- `resolveOperationRuntimeServices()`
- 两次 `serviceOption(...)`
- 中间对象组装

实现点：

1. `ModuleRuntime.impl.ts`
- 在构造 `operationRunner` 时，先解析一次默认 `OperationRuntimeServices`
- 仅当默认值确实为空时，才把它作为 `defaultRuntimeServices` 传给 `makeRunOperation(...)`

2. `ModuleRuntime.operation.ts`
- 新增 `isOperationRuntimeServicesEmpty(...)`
- `makeRunOperation(...)` 在默认空快照成立时走 fast path
- 非空默认值和其它场景保持原有慢路径

## 这刀没有做什么

- 不改 `txnQueue`
- 不改 `dispatch`
- 不改 deferred worker
- 不改 `StateTransaction`
- 不改变 middleware / runSession 的既有非空语义

## 验证

### 语义守门

通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts test/internal/Runtime/Runtime.OperationSemantics.test.ts
```

覆盖：

- 默认空快照下，`existing linkId` 和显式 `opSeq` 不漂
- 现有 `Runtime.OperationSemantics.test.ts` 继续通过，说明 runtime middleware 语义未被这刀破坏

### 贴边 micro-bench

通过：

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.Perf.off.test.ts
```

输出：

- `batch=256`
- `fast.p50=0.273ms`
- `fast.p95=0.416ms`
- `fast.avg=0.289ms`
- `legacy.p50=0.520ms`
- `legacy.p95=0.768ms`
- `legacy.avg=0.564ms`

解释：

- 这条 bench 直接命中 `runOperation(...)` 的空默认路径
- 单次样本太小会被时钟分辨率压平
- 放大成批量样本后，差值已经清晰

### 类型门

执行：

```bash
node node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

结果：

- 仍失败
- 当前失败点仍是既有 `Contracts.019.TxnPerfControls.test.ts` 的 JSON schema 解析
- 没有新增指向本刀修改文件的类型错误

## 结论

- `accepted_with_evidence`

理由：

1. 改动面小
2. 语义守门通过
3. 贴边 micro-bench 已给出明确正向收益

## 后续

若继续沿 `P0-2` 往下做，下一刀才考虑：

- 更广义的 `runOperation` 快照层
- 或把同类快照思路扩到其它空默认路径

当前不建议把这刀和其它方向混做。
