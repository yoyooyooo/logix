# 2026-03-20 · R2-B · Diagnostics Contract 最小实现

> worktree: `agent/v4-perf-r2b-diagnostics-impl`  
> branch: `agent/v4-perf-r2b-diagnostics-impl`

## 0. 目标与边界

本次只实现 `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md` 定义的最小 `R2-B diagnostics contract`：

- 收敛 `trace:txn-lane` 的 `policy` 为 `effective/explain/fingerprint`
- 固化五层 scope 链路与稳定顺序
- 补齐候选层 `present/writes/fingerprint`
- 保持字段 Slim、可序列化

本次未改 React/controlplane，未回到 queue-side 小常数微调，未扩面到 `R2-A tier surface`。

## 1. 实现摘要

### 1.1 `TxnLanePolicy` 新 contract（core resolver）

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

- scope 从旧口径收敛为五层：
  - `provider_module`
  - `provider_default`
  - `runtime_module`
  - `runtime_default`
  - `builtin`
- 新增固定字段集合 `TxnLanePolicyFieldKey`，用于 `writes`。
- `ResolvedTxnLanePolicy` 新增诊断主体：
  - `effective`
  - `explain`
  - `fingerprint`
- `fingerprint` 按 contract 的 canonical `v1|...` 生成，键顺序固定。
- `candidates` 固定长度 5，顺序固定为高优先级到低优先级。
- `present=true` 的候选层总是带 `fingerprint`。

### 1.2 解释链与运行时兼容

- 为了不动 `ModuleRuntime.impl.ts`，resolver 返回对象保留运行时读取字段（`enabled/budgetMs/...`），同时把这批字段设为非枚举属性。
- `trace:txn-lane` 事件投影时只暴露 contract 字段，避免旧字段混入 `meta`。

### 1.3 `TxnLaneEvidence` 类型收敛

文件：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

- `TxnLaneEvidence.policy` 改为 `TxnLaneEvidencePolicyV2`。
- 删除旧 `configScope` 与平铺旋钮字段在 evidence 类型上的直接定义。

## 2. 测试与门禁

### 2.1 代码侧断言更新

- `ModuleRuntime.TxnLanes.Overrides.test.ts`
  - 断言迁移到 `policy.effective/*` 与 `policy.explain.scope`
  - 增加 `explain.candidates` 固定顺序断言
- `ModuleRuntime.TxnLanes.DefaultOn.test.ts`
  - 断言迁移到新 contract 字段
- `Bound.test.ts`、`Runtime.InternalContracts.Accessor.test.ts`
  - runtime internals mock 升级到新 `ResolvedTxnLanePolicy` 结构

### 2.2 最小验证命令执行结果

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：

- `typecheck:test`：通过
- 指定 lane 相关测试：`2/2` 文件通过，`8/8` 用例通过
- `probe_next_blocker`：`status=clear`，`threshold_anomaly_count=0`

## 3. 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2b-diagnostics-impl.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2b-diagnostics-impl.probe-next-blocker.json`

## 4. 结论

`R2-B diagnostics contract` 已在最小改动面落地，`trace:txn-lane` 现在可以稳定回答：

- 最终生效 scope
- 固定优先级候选链路
- 各层 writes 与候选 fingerprint
- 全局策略 fingerprint（可跨运行对比）
