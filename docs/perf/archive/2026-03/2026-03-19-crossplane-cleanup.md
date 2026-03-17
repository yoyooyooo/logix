# 2026-03-19 · cross-plane 旧路径收口（去 LOGIX_CROSSPLANE_TOPIC 双分支）

## 目标

- 收掉 `LOGIX_CROSSPLANE_TOPIC` 双分支。
- `RuntimeStore / TickScheduler / RuntimeExternalStore` 统一走单一路径。
- 不重做既有性能切口，不触碰 selector/process/dispatch。

## 输入与约束

- 参考：
  - `docs/perf/archive/2026-03/2026-03-19-p1-4-crossplane-topic.md`
  - `docs/perf/archive/2026-03/2026-03-19-p2-3b-process-bus.md`
- `docs/perf/archive/2026-03/2026-03-19-identify-runtimestore-reactbridge.md` 在当前 worktree 不存在。
- 禁区未改：
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `packages/logix-core/src/internal/runtime/core/process/**`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `.codex/skills/logix-perf-evidence/assets/matrix.json`

## 代码改动摘要

### 1) TickScheduler 统一到 RuntimeStore topic 接口

文件：
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

改动：
- 删除 `LOGIX_CROSSPLANE_TOPIC` 环境开关与 legacy 分支。
- 删除本地 topic 解析缓存与字符串回退解析。
- `storeTopicToModuleInstanceKey` 固定使用 `store.resolveTopicModuleInstanceKey(...)`。
- selector topic 订阅判定固定使用 `store.getReadQuerySubscriberCount(...)`。
- selector topic dirty 入队固定使用 `store.getReadQueryTopicKey(...)`。

### 2) RuntimeExternalStore 统一到 RuntimeStore topic 接口

文件：
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

改动：
- 删除 `LOGIX_CROSSPLANE_TOPIC` 环境开关与 legacy 双分支。
- 删除本地 `makeModuleInstanceKey` / `makeReadQueryTopicKey` 拼接回退。
- module/readQuery topic key 固定通过 `runtimeStore.getModuleTopicKey(...)` /
  `runtimeStore.getReadQueryTopicKey(...)` 获取。
- 保留 `WeakMap` 缓存，减少高频调用重复解析。

### 3) RuntimeStore

文件：
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

改动：
- 本次未改代码。该文件已作为统一 topic 口径提供方，现由上游调用方强制走该路径。

## 最小验证与结果

执行时间（UTC）：
- `2026-03-19T07:46:33Z`

通过命令：

1. `pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
2. `pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts`
3. `pnpm --dir packages/logix-core typecheck`
4. `pnpm --dir packages/logix-react typecheck`
5. `python3 fabfile.py probe_next_blocker --json`

结果：
- topic/tick/store 相关测试通过。
- `lowPriority` 与 `idleTeardown` 测试通过。
- `probe_next_blocker` 返回 `status: clear`，当前 probe 队列未打红。

## 结论

- `LOGIX_CROSSPLANE_TOPIC` 在核心实现路径已完成清理，cross-plane topic 进入单路径语义。
- 本次改动不涉及 selector/process/dispatch 的实现切面。
