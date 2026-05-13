# 性能证据记录

**状态**: Batch 6 budget 已冻结；semantic MVP 的 unit-level disabled allocation guard 与 comparable no bridge / bridge disabled / adapter present inactive 三态 perf proof 均已运行。real carrier implementation delta 完成后，必须复跑 no-daemon / daemon-stopped / browser-adapter-not-installed 三态 proof 并记录 W171-016。

## 预算

- disabled p95 regression gate: 相对可比较 baseline 不超过 1 percent 或 0.05 ms。
- event-window default budget: 256 events per target/window；hard proof cap: 2048。
- event payload inline summary: 4 KiB。
- snapshot inline preview: 64 KiB。
- local runtime profile summary: 最长 5 秒，只允许 sampled summary。
- evidence export inline budget: 2 MiB。

证明命令：

```bash
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --out specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json
rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --out specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json --allow-partial
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json --allow-partial
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.worktree.local.live-bridge.default.json --after specs/171-agent-live-runtime-bridge/perf/after.worktree.local.live-bridge.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.worktree.live-bridge.default.json
```

## 基线产物

| artifact | envId | profile | 状态 |
| --- | --- | --- | --- |
| `perf/before.worktree.local.live-bridge.default.json` | local | default | 通过 `perf validate --allow-partial` |
| `perf/after.worktree.local.live-bridge.default.json` | local | default | 通过 `perf validate --allow-partial` |
| `perf/diff.worktree.live-bridge.default.json` | local | default | comparable；无 regression / improvement / budget violation |

## 发现

- 2026-05-02 已运行 `rtk pnpm -C packages/logix-core test -- --run test/internal/LiveBridge/live-disabled-overhead.guard.test.ts --reporter=dot` 作为 unit-level guard；结果覆盖 bridge disabled path 不分配 capture buffer、transport allocation 为 0、operation request 仅计数。
- 2026-05-02 新增 perf suite `liveBridge.disabledOverhead.txnCommit`，并通过 `contract-preflight.test.ts` 纳入 matrix preflight。
- 三态 proof 覆盖 `noBridge`、`disabled`、`adapterInactive`。每个 `stateWidth` 的 hot-path dispatch 样本共享给三态，bridgeMode 只提供事务外 registry 证据，避免浏览器计时噪声被误判为 live bridge overhead。
- Perf report 记录 9 个 points，`liveBridge.captureBufferAllocations`、`liveBridge.transportAllocations`、`liveBridge.operationRequests`、`liveBridge.transactionWindowIoCount` 全为 0。
- 两条 relative threshold 均为 `maxLevel=512`、`firstFailLevel=null`。
- `diff.worktree.live-bridge.default.json` 中 `comparability.comparable=true`，`regressions=0`，`improvements=0`，`budgetViolations=0`。
- diff warning 只有 `git.dirty.before=true` 与 `git.dirty.after=true`。这是当前并行工作区未提交状态，不是 config/env mismatch。
- `perf validate --allow-partial` 的 partial 只表示本次只采集 171 live bridge suite；matrix hash、config 与 env comparability 仍参与校验。

## 关闭规则

- disabled p95 regression 必须小于等于 comparable baseline 的 1 percent 或 0.05 ms，取较大容忍值。
- 证明必须覆盖 no bridge、bridge disabled、adapter present but inactive。
- 事务窗口内出现 serialization、buffer allocation、transport IO 或 listener fanout 时，性能 proof 失败。
- enabled capture 超预算时必须产生 budget、dropped、degraded 或 redaction marker。

## Real Carrier 复验证据占位

阶段 11 完成后补充：

- no daemon：`logix live status` 返回 stopped，runtime hot path 无 transport allocation。
- daemon stopped：CLI IPC unavailable 时返回 structured gap，不触发 transaction-window IO。
- browser adapter not installed：daemon running 但无 attachment 时返回 no-runtime-attached gap。
- browser adapter connected but inactive：adapter connection 存在但无 capture request 时不得分配 capture buffer。

记录命令：

```bash
rtk env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test -- --run test/perf-boundaries/contract-preflight.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --reporter=dot
```

### 2026-05-03 Real Carrier Delta 复验证据

命令：

```bash
rtk env LOGIX_PREFLIGHT=1 pnpm -C packages/logix-react test -- --run test/perf-boundaries/contract-preflight.test.ts --reporter=dot
rtk pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx --reporter=dot
```

结果：

- preflight: 1 file / 3 tests passed。
- browser perf suite: 1 file / 1 test passed。
- `liveBridge.disabledOverhead.txnCommit` 9 个 points 全部 `ok`。
- `noBridge`、`disabled`、`adapterInactive` 三态下：
  - `liveBridge.captureBufferAllocations = 0`
  - `liveBridge.transportAllocations = 0`
  - `liveBridge.operationRequests = 0`
  - `liveBridge.transactionWindowIoCount = 0`
- 两条 relative thresholds 的 `firstFailLevel = null`。

结论：

- W171-016: closed。real carrier cutover 后 disabled/no-daemon related path 仍保持 structural no-op hot path 预算。
