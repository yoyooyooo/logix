# 2026-03-22 · P1-6'' owner-aware resolve engine contract freeze（implementation-ready）

## 目标与范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-6pp-owner-resolve-engine-v2`
- branch：`agent/v4-perf-p1-6pp-owner-resolve-engine-v2`
- 本轮目标：把 `P1-6'' owner-aware resolve engine` 从 design-package 推进到 contract-freeze，并冻结 implementation line 的最小合同。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=true`
- 结果分类：`docs_only_ready_for_impl`

## 结论

`P1-6''` 当前可以进入独立 implementation line。  
design-package 的四项缺口 D1/D2/D3/D4 已在本文冻结，后续实现线只需按本文合同、矩阵与验证链路推进。

## D1 · `OwnerResolveRequested` 单一入口合同

### 冻结字段

```ts
type OwnerResolveMethod = 'read' | 'readSync' | 'warmSync' | 'preload'

type OwnerResolveLane = 'config' | 'neutral' | 'preload'

type OwnerResolveCause =
  | 'boot-confirm'
  | 'ready-confirm'
  | 'config-boot-owner-lock'
  | 'neutral-settled-refresh-allowed'
  | 'defer-preload-dispatch'
  | 'defer-preload-reuse-inflight'
  | 'defer-preload-token-completed'

type OwnerResolveRequested = {
  readonly ownerKey: string
  readonly lane: OwnerResolveLane
  readonly method: OwnerResolveMethod
  readonly cause: OwnerResolveCause
  readonly phase: string
  readonly epoch: number
  readonly ticket: {
    readonly ownerKey: string
    readonly lane: OwnerResolveLane
    readonly epoch: number
  }
  readonly fingerprint: string
}

type OwnerResolveDecision = {
  readonly action:
    | 'resolve-requested'
    | 'resolve-run'
    | 'resolve-commit'
    | 'resolve-skip'
    | 'resolve-stale-drop'
    | 'resolve-reject'
  readonly reason: string
  readonly reasonCode: string
  readonly executor: 'phase-machine' | 'legacy-control'
  readonly cancelBoundary: 'owner-lane' | 'none'
  readonly readiness: 'pending' | 'sync-ready' | 'async-ready' | 'stale' | 'cancelled'
}
```

### 四入口映射

| 入口 | `method` | 默认 lane | 允许 cause |
| --- | --- | --- | --- |
| `read` | `read` | `config` | `boot-confirm` / `ready-confirm` |
| `readSync` | `readSync` | `config` | `config-boot-owner-lock` |
| `warmSync` | `warmSync` | `neutral` | `neutral-settled-refresh-allowed` |
| `preload` | `preload` | `preload` | `defer-preload-dispatch` / `defer-preload-reuse-inflight` / `defer-preload-token-completed` |

冻结规则：
- 四入口统一走 `OwnerResolveRequested`，禁止 lane 分支绕开入口合同。
- `ownerKey + lane + epoch` 是唯一 ticket 主键。
- 所有 decision 都要落到 `OwnerResolveDecision` 字段集，禁止只写自由文本 reason。

## D2 · stale/commit reason 矩阵

| 判定条件 | 决策动作 | `reason` | `reasonCode` | 归类 |
| --- | --- | --- | --- | --- |
| ticket 过期（`requested.epoch < registry.epoch`） | `resolve-stale-drop` | `kernel-ticket-expired` | `react.controlplane.kernel.ticket.expired` | stale |
| owner-lane cancel boundary 关闭 | `resolve-stale-drop` | `owner-lane-cancelled` | `react.controlplane.owner.lane.cancelled` | stale |
| 当前 phase 与请求 phase 不一致 | `resolve-reject` | `owner-phase-mismatch` | `react.controlplane.owner.phase.mismatch` | reject |
| `warmSync` 命中同 fingerprint 且允许跳过 | `resolve-skip` | `config-fingerprint-unchanged` | `react.controlplane.config.fingerprint.unchanged` | skip |
| `preload` rerender 命中 in-flight 复用 | `resolve-skip` | `defer-preload-reuse-inflight` | `react.controlplane.preload.reuse.inflight` | skip |
| `preload` 命中 token 已完成 | `resolve-skip` | `defer-preload-token-completed` | `react.controlplane.preload.token.completed` | skip |
| ticket 合法并完成提交 | `resolve-commit` | `kernel-ticket-committed` | `react.controlplane.kernel.ticket.committed` | commit |

冻结规则：
- `kernel-ticket-expired` 只用于 ticket 过期，禁止复用到 phase mismatch 或 cancel 场景。
- stale/reject/skip/commit 必须映射到唯一 `reasonCode`，一条路径一个主语义。
- 同 `ownerKey + lane + epoch` 最多允许一次 `resolve-commit`。

## D3 · 四入口 phase-trace 稳定字段集

`trace:react.runtime.controlplane.phase-machine` 与 `runtime-bootresolve-phase-trace` 的统一字段冻结为：

```ts
type OwnerResolvePhaseTrace = {
  readonly action: OwnerResolveDecision['action']
  readonly reason: OwnerResolveDecision['reason']
  readonly reasonCode: OwnerResolveDecision['reasonCode']
  readonly ownerKey: string
  readonly lane: OwnerResolveLane
  readonly method: OwnerResolveMethod
  readonly cause: OwnerResolveCause
  readonly phase: string
  readonly epoch: number
  readonly ticket: {
    readonly ownerKey: string
    readonly lane: OwnerResolveLane
    readonly epoch: number
  }
  readonly fingerprint: string
  readonly executor: OwnerResolveDecision['executor']
  readonly cancelBoundary: OwnerResolveDecision['cancelBoundary']
  readonly readiness: OwnerResolveDecision['readiness']
}
```

冻结规则：
- 四入口事件都必须包含完整字段集，禁止某入口缺失 `method/cause/reasonCode`。
- phase-trace 断言使用确定性计数，不依赖时间窗口容错。
- `resolve-commit` 唯一性以 `(ownerKey, lane, epoch)` 判定，计数必须稳定为 `1`。

## D4 · `runtime-bootresolve-phase-trace` 断言矩阵

| 入口 | 必过断言 | 失败分类 |
| --- | --- | --- |
| `read` | 同 `(ownerKey, lane, epoch)` 的 `resolve-commit` 计数为 `1`；过期路径只允许 `kernel-ticket-expired` | `owner-ticket-uniqueness-drift` |
| `readSync` | `resolve-reject` 仅允许 `owner-phase-mismatch` 或 `owner-lane-cancelled` | `owner-phase-contract-drift` |
| `warmSync` | `neutral-settled-refresh-allowed + fingerprint unchanged` 必须产出 `resolve-skip/config-fingerprint-unchanged` | `warmsync-refresh-gate-drift` |
| `preload` | 同 token 仅一次 dispatch；rerender 只允许 `reuse-inflight` 或 `token-completed` skip | `preload-single-dispatch-drift` |

### 测试映射（冻结到单文件）

- 测试文件：`packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- 四入口 case id：
  - `owner-resolve.read.single-commit`
  - `owner-resolve.readsync.reject-reason`
  - `owner-resolve.warmsync.fingerprint-skip`
  - `owner-resolve.preload.single-dispatch`

### 最小验证链路

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
python3 fabfile.py probe_next_blocker --json
```

comparability 规则：
- 收益归因锚点只看四入口断言矩阵与 phase-trace 字段完整性。
- `probe_next_blocker` 的 `externalStore/form` 失败只记录 gate 噪声，不计入本线收益或失败归因。

## 开线准入条件

满足以下条件即可开 `P1-6''` implementation line：
- `public API change=false` 仍成立
- 不触 `packages/logix-core/**`
- 实施线严格沿 D1~D4 与最小验证链路推进
- 失败收口也必须保留 reason 矩阵与断言映射，不回退合同字段集

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮把 `P1-6''` 从 design-package 推进到 `implementation-ready=true`。
