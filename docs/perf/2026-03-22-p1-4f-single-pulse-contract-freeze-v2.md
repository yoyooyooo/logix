# 2026-03-22 · P1-4F single pulse contract freeze v2（implementation-ready）

## 目标与范围

- workspace：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4f-single-pulse-contract-v2`
- branch：`agent/v4-perf-p1-4f-single-pulse-contract-v2`
- 本轮目标：把 `P1-4F` 从 `not-ready` 推进到可执行的合同冻结包，覆盖三项 blocker 的最小方案、验证矩阵、成功门/失败门。
- 本轮实际收口：`docs/evidence-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=true`
- 结果分类：`docs_only_ready_for_impl`

## 结论

`P1-4F` 已具备开 implementation line 的合同清晰度。  
本文件冻结 `C1/C2/C3` 三项最小合同，并把验证矩阵、成功门、失败门写死，后续实现线只允许在本包定义的边界内落代码。

## C1 · TickScheduler selector interest contract（替换 readQuery subscriber count 门控）

### 最小合同

在 core 内部冻结 `selector interest` 门控口径，`TickScheduler.onSelectorChanged` 只读取 interest 合同，不再绑定 `getReadQuerySubscriberCount`：

```ts
type SelectorInterestContract = {
  readonly retainSelectorInterest: (moduleInstanceKey: string, selectorId: string) => () => void
  readonly hasSelectorInterest: (moduleInstanceKey: string, selectorId: string) => boolean
}
```

### 冻结约束

- `retainSelectorInterest` 支持 refCount 语义，同一 `(moduleInstanceKey, selectorId)` 可重入 retain。
- release 归零后 `hasSelectorInterest` 必须立即变为 `false`。
- `onSelectorChanged` 的 dirty 标记条件固定为 `hasSelectorInterest(...)===true`。
- 禁止继续以 `getReadQuerySubscriberCount` 作为 selector active 判断。

### 边界收益

- selector 活跃性语义从“topic 订阅数”切换为“interest 引用”，可与 module single-pulse 路径对齐。
- 为 `RuntimeExternalStore` 的 retain 生命周期提供唯一上游合同。

## C2 · RuntimeExternalStore readQuery activation retain 生命周期合同

### 最小合同

readQuery activation 的 retain/release 生命周期冻结为四态：

1. `idle`：无 listener，无 activation retain。
2. `active`：首个 listener 进入，执行一次 `retainReadQueryActivation`。
3. `grace`：最后一个 listener 离开后进入宽限窗口，默认 `16ms`。
4. `released`：grace 到期且仍无 listener，执行 release 并清理 topic 订阅。

### 冻结约束

- 同一 `(runtime, moduleInstanceKey, selectorId)` 在 `active` 期间只允许一个 activation retain 句柄。
- grace 窗口内重新订阅必须取消 teardown，并复用既有 activation retain。
- `released` 后再次订阅需要新建 retain 句柄。
- 生命周期以“selector interest + listener”双条件驱动，不允许仅凭 store 首尾监听器隐式推导。

### 与 C1 的对齐点

- 进入 `active` 时 retain selector interest。
- 进入 `released` 时 release selector interest。
- C2 的状态迁移要与 C1 的 refCount 同步收敛。

## C3 · useSelector 单订阅路径合同

### 最小合同

同一组件内同一 module 的多个 selector，冻结为单订阅输入路径：

- 复用 key：`componentOwner + runtime + moduleInstanceKey`
- 监听入口：module-level pulse input
- selector 过滤：`selectorDelta` 保守 membership + `equalityFn`

### 冻结约束

- 每个 `(componentOwner, runtime, moduleInstanceKey)` 最多 1 条底层 store 订阅。
- selector hook 级别仍可独立 `shouldNotify`，但不得再生成按 readQuery store 分裂的并行订阅链。
- `selectorDelta` 允许误报触发重算；禁止漏报导致漏通知。
- `componentOwner` 缺失路径保留现有 fallback 行为，并作为单独测试分支验证。

## focused validation matrix（冻结）

### V1 契约与类型门

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-react typecheck:test
```

### V2 C1 行为门（core）

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts \
  test/internal/Runtime/TickScheduler.topic-classification.test.ts \
  test/internal/Runtime/TickScheduler.selectorInterest.contract.test.ts \
  test/internal/Runtime/RuntimeStore.selectorInterest.refcount.test.ts
```

### V3 C2/C3 行为门（react）

```bash
pnpm -C packages/logix-react exec vitest run \
  test/internal/RuntimeExternalStore.lowPriority.test.ts \
  test/internal/RuntimeExternalStore.idleTeardown.test.ts \
  test/internal/RuntimeExternalStore.readQueryActivation.lifecycle.test.ts \
  test/Hooks/useSelector.sharedSubscription.test.tsx \
  test/Hooks/useSelector.readQueryRetainScope.test.tsx \
  test/Hooks/useSelector.singlePulseSingleSubscription.test.tsx
```

### V4 可比性门

```bash
python3 fabfile.py probe_next_blocker --json
```

## 成功门（SG）

- `SG-1`：`V1~V3` 全绿，且新增契约测试文件存在并执行。
- `SG-2`：`TickScheduler.onSelectorChanged` 不再读取 `getReadQuerySubscriberCount`。
- `SG-3`：单组件 8 个 selector 场景下，module 订阅链保持单条，listener fanout 不超过 1 条 lead 路径。
- `SG-4`：readQuery retain 在 mount/unmount/grace/remount 序列中无泄漏、无重复 retain。
- `SG-5`：`probe_next_blocker --json` 为 `status=clear`；若有失败仅允许归类到既有 soft watch 并可证伪与本线无归因关系。
- `SG-6`：实现线只触及 `P1-4F` 冻结边界，不串改 `R-2/P1-6''/SW-N3/N-3` 合同面。

## 失败门（FG）

- `FG-1`：任一 `V1~V3` 失败。
- `FG-2`：出现 selector 漏通知。
- `FG-3`：出现 activation retain 泄漏或重复 retain。
- `FG-4`：订阅链重新退化为按 readQuery store 扇出。
- `FG-5`：`probe_next_blocker` 出现可归因到本线的非 environment 稳定失败。
- `FG-6`：实现 diff 超出冻结边界并引入新的并行合同面。

## 开线裁决

满足 `SG-1~SG-6` 即可开 `P1-4F` implementation line。  
命中任一 `FG-*` 即按 docs/evidence-only 回滚收口，不保留半成品实现。

## 交叉引用

- `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`
- `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`
- `docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
- `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.evidence.json`
