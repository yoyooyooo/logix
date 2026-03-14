# 2026-03-13 · 保留刀与废弃刀清单

本页只记录当前阶段已经验证过的切刀去留结论。

约束：
- “保留”只保留已拿到稳定正收益、且建议继续留在主线的改动
- “废弃”包含两类：
  - 明确无收益或混合收益，不建议继续保留
  - 仅用于定位和解释，不作为主线 runtime 改动保留

## 保留刀

### K-1 · `watchers` runtime writeback fold

- 结论：保留
- 提交：`95462a2e`
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- 关键 run：`22993176276`
- 结果：`regressions=0 / improvements=10`

保留原因：
- 这是当前阶段唯一拿到稳定、明确正收益的 runtime 刀
- 直接命中真实根因：
  - direct action state writeback 在事务内逐条执行
  - `nativeCaptureSeen=1`
  - `handlerStartSeen=1`
  - `lastValue=0`
- 改完后 `watchers` 的 `256/512` 档位被打穿，收益面明确

做法摘要：
- 把 `applyActionStateWritebacks` 从“每个 handler 单独 `readState + setStateInternal/updateDraft`”
- 改成“单次 dispatch 内按顺序折叠后统一提交”

### F-1 · `StateTransaction` commit prep fastpath

- 结论：保留
- 文件：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- 关键记录：`docs/perf/2026-03-13-f1-statetransaction-commit-prep-fastpath.md`

保留原因：
- 这刀命中了 `externalStore.ingest.tickNotify` 的提交前纯分配成本
- 切刀前，同口径样本里：
  - `phaseCommitMs≈5.45ms`
  - `phasePreStoreCommitMs≈5.31ms`
- 切刀后，`phasePreStoreCommitMs` 下探到约：
  - `5.04ms`
  - `4.38ms`
- 同时 `commitTick` 内部继续保持亚毫秒级
- 当前可以把剩余主税点继续收窄到 `tickFlushLag`

做法摘要：
- 去掉 `buildCommittedTransaction(...)` 里对 `patches.slice()` / `Array.from(dirtyPathIds)` 的无条件分配，改为 handoff + snapshot 维护

### U-1 · `TickScheduler` scheduleTick immediate start

- 结论：保留
- 文件：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- 关键记录：`docs/perf/2026-03-14-u1-tickscheduler-start-immediately.md`

保留原因：
- 只改一处 detached fiber 启动方式，就把 `externalStore.ingest.tickNotify` 从 `~5ms ~ 6ms` 级压回 `~0.8ms ~ 1.1ms`
- browser targeted 和 soak 都把 `p95<=3ms` 打穿到 `watchers=512`
- soak 下 `full/off<=1.25` 也一起回到门内

做法摘要：
- 把 `scheduleTick()` 末尾的 `Effect.forkDetach()` 改成 `Effect.forkDetach({ startImmediately: true })`

## 废弃刀

### D-1 · `externalStore` single-field fast path

- 结论：废弃
- 分支：`agent/effect-v4-external-store-p95`
- 文件：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 关键 run：`22993811804`

废弃原因：
- `watchers=128` 档位改善
- `256/512` 档位出现反向波动
- 没形成稳定全域收益
- 不符合主线保留标准

### D-2 · `RuntimeExternalStore` notify coalescing

- 结论：废弃
- 分支：`agent/effect-v4-external-store-notify`
- 文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- 关键 run：`22994062160`

废弃原因：
- `watchers=128` 档位改善明显
- `256` 仅小幅改善
- `512/full` 变差
- 仍然没形成稳定全域收益

### D-3 · `externalStore` burst writeback batching

- 结论：废弃
- 分支：`agent/effect-v4-external-store-burst-batch`
- 文件：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 关键记录：`docs/perf/2026-03-13-d3-external-store-burst-batching-failed.md`

废弃原因：
- 邻近 tests 和 `typecheck:test` 虽然通过
- browser targeted perf 因环境阻塞未拿到 `256/512` 结果
- 不满足“稳定打到 256/512”这个保留标准
- 当前只能按 evidence-only 失败线收口

### D-4 · `externalStore` raw direct writeback fallback

- 结论：废弃
- 文件：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 关键记录：`docs/perf/2026-03-14-d4-external-store-raw-direct-failed.md`

废弃原因：
- browser targeted 仍停在 `~5.6ms ~ 6.1ms`
- soak 对比 `effect-v4 r3` 没有稳定净收益
- `off / 256` 甚至从 `~5.2ms` 回到 `~6.1ms`
- 说明 raw path 回退不是当前主税点

### G-1 · `TickScheduler` flush-before-commit fast path

- 结论：废弃
- 文件：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- 关键记录：`docs/perf/2026-03-13-g1-tickscheduler-flush-before-commit-failed.md`

废弃原因：
- node-only 补证里一度出现 `phaseFlushBeforeCommitMs≈1.08ms`
- 主会话复跑回到 `phaseFlushBeforeCommitMs≈1.92ms`
- 收益不稳，不适合作为主线保留刀

### T-1 · `txn-phase` 默认采样门收紧

- 结论：废弃
- 文件：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- 关键记录：`docs/perf/2026-03-14-t1-txn-phase-gate-failed.md`

废弃原因：
- 只改善了部分 `full` 点位
- `off / 256` 从 `~5.2ms` 回到 `~6.1ms`
- 绝对 `p95<=3ms` 仍全线失守
- 说明默认 `txn-phase` 采样门不是当前主税点

### C-2 · `react.bootResolve.sync` config reload skip

- 结论：废弃
- 分支：`agent/effect-v4-bootresolve-sync-tax`
- 文件：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- 关键证据：
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.json`
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.r2.json`

废弃原因：
- 第一轮 `sync` 切片有改善，但第二轮没有稳定复现
- `sync + auto + microtask` 在 `r2` 直接反向
- `suspend` 多个切片出现分布漂移
- 不符合“稳定净收益”保留标准

### C-3 · `react.bootResolve.sync` readSync scope-make fastpath

- 结论：废弃
- 文件：`packages/logix-react/src/internal/store/ModuleCache.ts`
- 关键记录：`docs/perf/2026-03-14-c3-bootresolve-readsync-scope-fastpath-failed.md`

废弃原因：
- `sync + auto + none` 从 `p95 18.1ms` 变到 `19.9ms`
- `sync + explicit + none` 中位数从 `9.7ms` 变到 `14.9ms`
- 还顺带拉坏了 `suspend + auto + none`
- 说明 `readSync` 的 `Scope.make()` 入口不是正确切口

### C-5 · `react.bootResolve.sync` provider.gating idle binding fastpath

- 结论：废弃
- 文件：`packages/logix-react/src/internal/provider/runtimeBindings.ts`
- 关键记录：`docs/perf/2026-03-14-c5-provider-gating-idle-binding-failed.md`

废弃原因：
- `useLayerBinding(enabled=false)` 的确会多跑一轮 render
- 但把这轮 idle rerender 去掉后，`sync` 只拿到局部小收益
- `sync + explicit + microtask` 在 soak 里直接从 `p95 19.4ms` 变到 `23.4ms`
- 不符合稳定净收益标准

### C-6 · `react.bootResolve` observer-ready benchmark correction

- 结论：不保留为主线性能刀
- 文件：
  - `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
  - `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.wait.ts`
- 关键记录：`docs/perf/2026-03-14-c6-bootresolve-observer-ready.md`

裁决原因：
- 价值在于修正 benchmark 语义
- 直接证明旧 `bootResolve.sync` 小税主要是 RAF 轮询地板
- 这不是 runtime 提速刀，不计入主线 runtime 保留刀

### E-1 · `watchers` capture retry

- 结论：不保留为主线性能刀
- 关键 run：`22987711765`

废弃原因：
- 作用是把 benchmark 从“采样阻塞”推进到“可比较”
- 这是证据面修复，不是主线 runtime 优化
- 其价值已经被后续 runtime 刀吸收，单独不作为保留刀

### E-2 · `watchers` shared-sample evidence

- 结论：不保留为主线性能刀
- 关键 run：`22988473253`

废弃原因：
- 作用是收掉 `domStable` 的重复采样噪声
- 本质上是 benchmark 语义收口
- 不属于主线 runtime 改动

### E-3 · `watchers` native-capture anchor

- 结论：不保留为主线性能刀
- 关键 run：`22988763385`

废弃原因：
- 作用是把页面外 click 注入税从主指标里剥掉
- 这一步用于建立正确测量语义
- 不属于主线 runtime 改动

### E-4 · `watchers` strict stage-split

- 结论：不保留为主线性能刀
- 关键 run：`22990519675`

废弃原因：
- 作用是把 broad timeout 收敛成具体阶段错误
- 用于归因，不用于提速

### E-5 · `watchers` failure flags / last-value

- 结论：不保留为主线性能刀
- 关键 runs：`22991199142`、`22990821549`

废弃原因：
- 作用是把失败信息细化成：
  - `lastValue`
  - `nativeCaptureSeen`
  - `handlerStartSeen`
- 只用于锁定真正 runtime 根因
- 价值已经在 `K-1` 里兑现

## 当前裁决

当前阶段：
- 真正建议保留并继续背书的：
  - `K-1`
  - `F-1`
  - `U-1`
- 其它切刀要么是定位刀，要么是收益不稳的实验刀

## 后续使用方式

- 以后若只想知道“哪些已经证明值得留、哪些只是试验过”
- 优先看本页，而不是回翻所有 dated 记录
