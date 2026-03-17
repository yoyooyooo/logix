# 2026-03-14 · 当前有效结论

本页只保留当前阶段仍然有效、可直接驱动后续行动的结论。

目标：

- 统一覆盖已经被后续证据推翻或收口的旧判断
- 让后续继续读 perf 结论时，不需要在多篇 dated 文档里来回跳

## 当前有效结论

### 1. current-head 没有默认 runtime blocker

证据：

- `docs/perf/archive/2026-03/2026-03-14-c7-current-head-reprobe-clear.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/archive/2026-03/2026-03-16-v4-perf-post-recovery-reprobe-clear.md`

结论：

- `probe_next_blocker --json` 继续返回 `clear`
- 默认不再开新的 perf worktree

### 2. `rowId gate` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-16-d3-no-trackby-rowid-gate.md`

结论：

- no-trackBy list 的 `validate/source` 重复 reconcile 已被切掉
- 当前仍维持 `accepted_with_evidence`
- `rows=100` 的单次 `p95` 尖峰只作为 sub-ms 观察点，不改总体裁决

### 3. `onCommit scheduler envelope` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-16-p1-oncommit-scheduler-minimal-envelope.md`

结论：

- `onCommit -> scheduler.onModuleCommit(...)` 的 envelope 已进一步收紧
- 合入母线后最小语义验证继续通过
- 合入后 `probe_next_blocker --json` 仍然为 `clear`

### 4. `P0-2 existing-link inline operation fast path` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-16-p0-2-existing-link-inline-fast-path.md`

结论：

- `runOperation` 在 `existingLinkId + middleware=[]` 路径上的剩余壳税已进一步收窄
- 合入母线后最小语义验证与 `typecheck:test` 继续通过
- 新增贴边 micro-bench 继续给出稳定正收益

### 5. `P0-2 transaction HotSnapshot` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-16-p0-2-transaction-hot-snapshot.md`

结论：

- 普通 transaction 热路径已收成 `TxnHotSnapshot`
- deferred handoff 与普通 transaction 复用同一套热上下文思路
- 合入母线后相关守门、`typecheck:test` 与贴边 perf 继续通过

### 6. `P0-2 transaction / operation shared hot context` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-17-p0-2-transaction-operation-hot-context.md`

结论：

- active transaction 已能把 `operationRuntimeServices` 继续下沉给 `runOperation(...)`
- 相关语义守门、`typecheck:test` 与贴边 perf 在母线复验继续通过
- `P0-2` 当前已经从单点特例推进到跨 transaction / operation 的共享 hot context

### 7. `externalStore.ingest.tickNotify` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-14-u1-tickscheduler-start-immediately.md`

结论：

- `p95<=3ms` 已打穿到 `watchers=512`
- soak 下 `full/off<=1.25` 也已回到门内
- 这条线不再是默认 blocker

### 8. `react.bootResolve.sync` 的旧“小固定税”结论已失效

证据：

- `docs/perf/archive/2026-03/2026-03-14-c6-bootresolve-observer-ready.md`

结论：

- 旧 suite 的主要税点是 `requestAnimationFrame` 轮询地板
- 切到 `MutationObserver` 后，`sync/suspend` 都回到 `~1ms` 级
- 因此旧的 `bootResolve.sync` runtime 小税不再成立

### 9. `react.bootResolve.sync` 已明确排除的切口

证据：

- `docs/perf/archive/2026-03/2026-03-13-c2-bootresolve-sync-config-reload-failed.md`
- `docs/perf/archive/2026-03/2026-03-14-c3-bootresolve-readsync-scope-fastpath-failed.md`
- `docs/perf/archive/2026-03/2026-03-14-c5-provider-gating-idle-binding-failed.md`

结论：

- `config reload skip` 不是正确切口
- `readSync scope-make fastpath` 不是正确切口
- `provider.gating idle binding fastpath` 也不是正确切口

### 10. 当前没有默认实现下一刀；若被迫只在三条候选里选，优先 `P1-4`

证据：

- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/09-worktree-open-decision-template.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-16-v4-perf-next-cut-identification.md`
- `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-4-normal-notify-shared-microtask-flush.md`

结论：

- current-head 仍然没有默认 runtime 下一刀
- 若 future-only 候选池被迫只在 `P1-4 / P1-6 / P1-7` 中选：
  - `P1-4 > P1-6 > P1-7`
- `P1-5` 已收口，不再作为默认 watchlist 第一位
- `P1-3` 已被否决，不再作为条件性下一刀
- `P1-4` 虽仍排在三者第一位，但 `normal notify shared microtask flush` 这条更窄 retry 已失败
- 这条 micro-slice 默认不再重开；若未来重回 `P1-4`，只看更大的 cross-plane 收口
- 只有在以下条件成立时才允许继续开新的 perf 实施线：
  1. 新的 real probe failure
  2. 新的 clean/comparable native-anchor 证据
  3. 新的产品级 SLA

## 已被覆盖的旧判断

以下旧判断不应再直接拿来驱动行动：

- `externalStore.ingest.tickNotify` 仍是共同未收口绝对预算债
- `react.bootResolve.sync` 存在稳定小固定税
- `provider.gating` 是当前唯一值得继续切的已确认 runtime 税点

这些说法都已被 `U-1 / C-6 / C-7` 或后续失败试探覆盖。

## 当前默认动作

- 不开新的 perf worktree
- 不继续盲切 runtime
- 若只是维护 current-head 结论，只做 docs/evidence-only 收口
- 若未来必须继续，且范围只限 `P1-4 / P1-6 / P1-7`，默认优先 `P1-4`

### 11. `P1-5 selector activation ownership` 已收口

证据：

- `docs/perf/archive/2026-03/2026-03-17-p1-5-react-selector-activation-grace.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-core-selector-retain-release.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-retain-scope-tax.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-selector-entry-reuse.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-readquery-store-idle-gc.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-cached-entry-cap-reset.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`

结论：

- React 侧 selector activation 已能跨短 listener gap 复用
- activation ownership 已进一步下沉到 core retain/release，React store 不再自持 readQuery drain fiber
- retain/release 冷路径里的无效 scope 固定税已去掉，direct retain/release micro-bench 继续为正
- long-gap cold activation 已开始复用 selector entry / hub，entry lifecycle 固定税继续显著下降
- readQuery facade 的“只建 store 不订阅”常驻 cache 已收掉，10k unique selector probe 的空转常驻几乎归零
- corrected retained heap 口径下，cached selector entry 主导常驻已从约 26.2MB 收到约 1.32MB
- pure core retain/release corrected probe 也只剩约 1.15MB，P1-5 retention 线已经接近收口
- 相关回归、`packages/logix-react typecheck:test` 与贴边 micro-bench 继续通过
- 后续若继续推进 `P1-5`，只在出现新的 retained heap blocker 时再重开，不回到 React 侧继续叠补丁

### 12. `P1-3 large-batch-only` 不成立

证据：

- `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`

结论：

- `64 / 256` 档位 local micro-bench 虽然转正
- 但 externalStore runtime 与 module-as-source tick 语义回归失败
- `P1-3` 当前没有能保留代码的切口
