# 2026-03-22 · N-3 runtime-shell attribution contract freeze（implementation-ready）

## 目标与范围

- workspace：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.n-3-runtime-shell-attribution-v2`
- branch：`agent/v4-perf-n-3-runtime-shell-attribution-v2`
- 本轮目标：冻结 `N-3 runtime-shell.resolve-boundary-attribution-contract` 的 boundary decision 合同、reason taxonomy、ledger v1.1 字段分层与 focused validation matrix。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=true`
- 结果分类：`docs_only_ready_for_impl`

## 结论

`N-3` 可以进入独立 implementation line。  
此前 design package 的 D1/D2/D3/D4 缺口已冻结到单一合同包，后续实施线按本文件合同、验证矩阵和证据命名执行即可。

## D1 · `resolveRuntimeShellBoundary(...)` 最小合同

### 冻结字段

```ts
type RuntimeShellMode = 'snapshot' | 'noSnapshot'

type RuntimeShellBoundaryClass =
  | 'snapshot_ready'
  | 'snapshot_blocked'
  | 'reuse_hit'
  | 'reuse_miss'
  | 'policy_fallback'
  | 'diagnostics_escalated'

type RuntimeShellSource =
  | 'resolveShell.snapshot'
  | 'resolveShell.noSnapshot'
  | 'operationRunner.shared'
  | 'operationRunner.fallback'

type RuntimeShellBoundaryDecision = {
  readonly mode: RuntimeShellMode
  readonly reasonCode: RuntimeShellReasonCode
  readonly boundaryClass: RuntimeShellBoundaryClass
  readonly reuseKeyHash?: string
  readonly shellRef?: {
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq?: number
  }
  readonly shellSource: RuntimeShellSource
}
```

### 冻结约束

- `resolve-shell` 与 `operationRunner` 必须共享同一个 `RuntimeShellBoundaryDecision` 结构。
- `reuseKeyHash` 允许缺省，禁止写入可逆原始 key。
- `shellRef` 只允许稳定锚点字段（`instanceId/txnSeq/opSeq`），禁止大对象挂载。
- `boundaryClass` 必须和 `reasonCode` 保持一一可解释映射。

### 路径映射

| 链路入口 | 样本路径 | `mode` 映射 | `shellSource` |
| --- | --- | --- | --- |
| resolve-shell 命中 snapshot | `resolveShell.snapshot` | `snapshot` | `resolveShell.snapshot` |
| resolve-shell 落 noSnapshot | `resolveShell.snapshot` | `noSnapshot` | `resolveShell.noSnapshot` |
| operationRunner 走 shared | `operationRunner.txnHotContext` | `snapshot` | `operationRunner.shared` |
| operationRunner 走 fallback | `operationRunner.txnHotContext` | `noSnapshot` | `operationRunner.fallback` |

## D2 · reason taxonomy 冻结

### 冻结枚举

```ts
type RuntimeShellReasonCode =
  | 'snapshot_missing'
  | 'snapshot_scope_mismatch'
  | 'middleware_env_mismatch'
  | 'trait_config_mismatch'
  | 'concurrency_policy_mismatch'
  | 'diagnostics_level_escalated'
```

### 冻结语义

| `reasonCode` | 触发条件 | 允许出现的 `boundaryClass` |
| --- | --- | --- |
| `snapshot_missing` | 当前 shell 无可复用 snapshot | `snapshot_blocked` / `reuse_miss` |
| `snapshot_scope_mismatch` | snapshot 存在但 scope 不匹配 | `snapshot_blocked` / `reuse_miss` |
| `middleware_env_mismatch` | middleware/env 指纹不一致 | `policy_fallback` |
| `trait_config_mismatch` | trait 配置指纹不一致 | `policy_fallback` |
| `concurrency_policy_mismatch` | 并发策略约束不一致 | `policy_fallback` |
| `diagnostics_level_escalated` | 诊断等级升级触发边界切换 | `diagnostics_escalated` |

冻结规则：

- 只允许枚举值，禁止自由字符串。
- `resolve-shell` 与 `operationRunner` 必须共享同一枚举。
- 后续若要新增 reason，必须先更新本合同与 evidence 口径，再进实现线。

## D3 · ledger v1.1 字段分层

### L0 兼容层（保持 v1 既有指标）

- `dispatchShell.phases.light`、`resolveShell.metrics.*`、`operationRunner.metrics.*` 既有字段保持不变。
- 旧 summary 指标名不改，现有 diff 脚本可直接复用。

### L1 样本层（新增 attribution 字段）

`resolveShell.snapshot` sample 新增：

- `decision.mode`
- `decision.reasonCode`
- `decision.boundaryClass`
- `decision.reuseKeyHash`
- `decision.shellSource`
- `decision.shellRef.{instanceId,txnSeq,opSeq?}`

`operationRunner.txnHotContext` sample 新增：

- 同口径 `decision.*` 字段
- `shared/fallback` 路径必须映射到同一 `mode` 语义

### L2 派生层（summary / diff）

只允许新增 slim 派生视图：

- `attribution.reasonShare`
- `attribution.boundaryClassShare`
- `attribution.noSnapshotTopReason`

冻结规则：

- 派生层只读 L1 样本，禁止引入第二套推导输入。
- raw 样本、summary、diff 三层必须同口径。
- 所有新增字段都要保持 slim、可序列化。

## D4 · focused validation matrix

### 契约层

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts
```

### 账本层

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts
```

### comparability 层

```bash
python3 fabfile.py probe_next_blocker --json
```

### 验证裁决规则

- reason 覆盖率门：`mode=noSnapshot` 与 `fallback` 样本的 `reasonCode` 覆盖率 `>=95%`。
- 唯一 nextcut 门：`reasonShare` 头部项占比稳定达到 `>=35%` 才允许把下一刀收敛为唯一切口。
- 噪声隔离门：`probe_next_blocker` 继续只承担 non-regression 与 gate 噪声归类，不承担 N-3 收益证明。

## 开线准入条件

满足以下条件即可开 `N-3` 实施线：

- `public API change=false` 仍成立。
- 与其他 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.*` 结构重排保持串行。
- 实现线按本文验证矩阵产出同命名 evidence 工件。

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮把 `N-3` 从 design-package 推进到 `implementation-ready=true`。
