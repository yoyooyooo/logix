# 2026-03-19 · React selector listener multiplex（组件实例级）

## 目标

在不改 public API 的前提下，压缩同一组件实例内、同一 topic 上多次 `useSelector` 的 listener 回调扇出。

约束：

- 只改 React bridge / RuntimeExternalStore / useSelector。
- 不改 core selector graph / process / matrix。

## 实现摘要

### 1) `RuntimeExternalStore` 增加组件级 multiplex 订阅

文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

- 新增 `subscribeRuntimeExternalStoreWithComponentMultiplex(...)`。
- 用 `WeakMap<ComponentOwner, WeakMap<store, bucket>>` 维护组件实例和 topic store 的订阅聚合。
- 每个 `componentOwner + store(topic)` 只向底层 `store.subscribe` 建一个监听器。
- bucket 内记录多个 hook listener，只触发 lead listener，避免同组件同 topic 的 N 次回调扇出。

### 2) `useSelector` 接入组件 owner 识别并走 multiplex

文件：`packages/logix-react/src/internal/hooks/useSelector.ts`

- 新增 `readCurrentComponentOwner()`：
  - 优先读取 React 19 `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A.getOwner()`。
  - 回退 legacy `ReactCurrentOwner.current`。
- 每个 hook 持有稳定 `hookListenerId`（`Symbol`）。
- 若能拿到 `componentOwner`，`useSyncExternalStoreWithSelector` 的 `subscribe` 走 `subscribeRuntimeExternalStoreWithComponentMultiplex`。
- 拿不到 owner 时保持原路径，语义不变。

### 3) 补贴边正证据测试

文件：`packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`

- 在现有 shared subscription 用例里增加对 module store 的观测：
  - `moduleStoreSubscribeCallCount === 1`
  - 单次更新后的 `moduleStoreListenerCallCount === 1`
- 该断言直接覆盖“同组件同 topic 多 selector 的 listener 回调扇出压缩”。

## 最小验证

1. `pnpm --dir packages/logix-react test -- --run test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.laneSubscription.test.tsx test/Hooks/useSelector.structMemo.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts`
2. `pnpm --dir packages/logix-react typecheck`
3. `python3 fabfile.py probe_next_blocker --json`

结果：

- React hooks/store 贴边测试通过（6 files / 8 tests）。
- `logix-react` typecheck 通过。
- `probe_next_blocker` 返回 `status: clear`，当前 probe 队列未打红。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-react-selector-multiplex.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-react-selector-multiplex.probe-next-blocker.json`

## 结论

`accepted_with_evidence`。同一组件实例内同 topic 的多 `useSelector` listener 回调已压缩为单回调链路，未引入 public API 变更。
