# 2026-03-19 · P1-4 cross-plane topic 收口线

## 范围

本线只做 cross-plane topic 收口，代码落点限定为：

- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

明确不做：

- `topicId minimal cut`
- `normal notify shared microtask flush`
- `SelectorGraph.ts` / `process/**` / `ModuleRuntime.dispatch.ts` 相关切口

## 改动摘要

### 1) RuntimeStore 成为 topic 统一口径中心

- 新增 topic 归一化能力：
  - `getModuleTopicKey(moduleId, instanceId)`
  - `getReadQueryTopicKey(moduleInstanceKey, selectorId)`
  - `resolveTopicModuleInstanceKey(topicKey)`
  - `getReadQuerySubscriberCount(moduleInstanceKey, selectorId)`
- 在 store 内维护 topic 解析缓存与 readQuery topic key 缓存，避免 TickScheduler/React 侧各自拼接与解析。
- readQuery subscriber 计数下沉到 RuntimeStore，供 TickScheduler 走 O(1) 判定。

### 2) TickScheduler 接入 cross-plane topic 通道

- accepted/deferred topic 分类不再使用本地字符串解析缓存主路径，改走 `RuntimeStore.resolveTopicModuleInstanceKey(...)`。
- `onSelectorChanged` 不再每次先拼接 readQuery topic key 再查订阅，改为：
  - 先查 `RuntimeStore.getReadQuerySubscriberCount(...)`
  - 再按需取 `RuntimeStore.getReadQueryTopicKey(...)` 入队
- 保留对照开关 `LOGIX_CROSSPLANE_TOPIC`（默认开启，`0` 回退 legacy），用于 before/after 取证。

### 3) RuntimeExternalStore 接入统一 topic 键生成

- module/readQuery topic key 生成切换到 RuntimeStore 统一接口（受 `LOGIX_CROSSPLANE_TOPIC` 控制）。
- 增加 `WeakMap` 级别 module/readQuery topic key 缓存，避免高频 `getRuntime*ExternalStore` 调用重复算 key。

## 与旧失败切口的差异

- 本线没有触碰 `normal-path shared microtask flush`，不以“每 runtime 合并一次 normal microtask”作为目标。
- 本线没有回退到 `topicId minimal cut`。
- 本线聚焦 topic 归一化与跨 plane 收口：topic key 生成、订阅判定、topic 分类三段统一到 RuntimeStore 口径。

## Targeted Perf 证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-4-crossplane-topic.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-4-crossplane-topic.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-4-crossplane-topic.diff.json`

口径（`LOGIX_CROSSPLANE_TOPIC=0` vs `1`）：

- `tick.selectorGate.noSubscriber`
  - mean: `15.0368ms -> 2.8500ms`（delta `-12.1868ms`, ratio `0.1895`）
- `tick.selectorGate.withSubscriber`
  - mean: `45.9779ms -> 8.7272ms`（delta `-37.2507ms`, ratio `0.1898`）

行为一致性：

- diff 中 `semanticDriftDetected=false`
- 两个 suite 的语义检查均保持一致（无订阅不 bump；有订阅单次 flush 后 topicVersion=1 且 notify=1）

结论：

- cross-plane topic 路径存在明确正证据，且语义未漂移。

## 最小验证

已执行：

1. `pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
2. `pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts`
3. `pnpm --dir packages/logix-core typecheck`
4. `pnpm --dir packages/logix-react typecheck`
5. `python3 fabfile.py probe_next_blocker --json`

probe 落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-4-crossplane-topic.probe-next-blocker.json`
- 状态：`clear`

## 结果分类

`accepted_with_evidence`
