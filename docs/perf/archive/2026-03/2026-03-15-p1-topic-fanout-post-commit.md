# 2026-03-15 · P1 topic fanout post-commit

## 这刀做了什么

目标只做 `topic-plane` 的第二刀最小切面：

- `flushTick(...)` 里先完成 snapshot / version bump / accepted drain 提交
- listener fanout 不再内联在 `RuntimeStore.commitTick(...)` 的 callback fast path 里执行
- 改成 `commitTick(...)` 返回 `changedTopicListeners`，再由 `TickScheduler` 在 tick 提交后统一 fanout

本刀没有做：

- `topicId` 重构
- `RuntimeExternalStore` 通知器收敛
- listener fanout 异步化到独立 host queue

## 实现边界

代码落点：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

测试落点：

- `packages/logix-core/test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts`
- `packages/logix-core/test/internal/Runtime/TickScheduler.topicFanout.Perf.off.test.ts`

## 证据

### 语义守门

通过：

- `test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- `test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts`

覆盖点：

- `topicVersion` 仍正常递增
- listener 调用次数不变
- `flushNow` 之后 module topic / readQuery topic 仍会收到通知

### 贴边 micro-bench

命令：

```bash
/Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/node_modules/.bin/vitest run test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts test/internal/Runtime/TickScheduler.topicFanout.Perf.off.test.ts
```

module topic：

- `listeners=64`
  - `legacyCommit.mean=0.0053609ms`
  - `postCommit.mean=0.0005343ms`
- `listeners=512`
  - `legacyCommit.mean=0.0179164ms`
  - `postCommit.mean=0.0007407ms`
- `listeners=2048`
  - `legacyCommit.mean=0.0587758ms`
  - `postCommit.mean=0.0007333ms`

readQuery topic：

- `listeners=64`
  - `legacyCommit.mean=0.0019565ms`
  - `postCommit.mean=0.0001036ms`
- `listeners=512`
  - `legacyCommit.mean=0.0143534ms`
  - `postCommit.mean=0.0001244ms`
- `listeners=2048`
  - `legacyCommit.mean=0.0560033ms`
  - `postCommit.mean=0.0003427ms`

解释：

- 这条证据直接命中本刀目标：
  - old: listener callback 卡在 commit critical section
  - new: callback 移到 post-commit fanout
- `postFanout` 本身仍有成本，但 `commitTick / flushTick` 的 critical section 明显变薄

## 验证

通过：

```bash
/Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/node_modules/.bin/vitest run test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts test/internal/Runtime/TickScheduler.topicFanout.Perf.off.test.ts
```

未通过：

```bash
node /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/node_modules/typescript/bin/tsc -p packages/logix-core/tsconfig.test.json --noEmit
```

失败原因：

- 仍是当前工作区既有的仓库级类型噪声
- 主要集中在 Node 类型、JSON schema 解析、跨包依赖解析
- 当前没有新增指向本刀改动文件的类型错误

## 裁决

结论：保留，建议合入。

原因：

1. 语义守门通过
2. 贴边 micro-bench 对 module topic 和 readQuery topic 都给出稳定正向结果
3. 这刀和已合入 `topic gate` 不冲突，一个打无订阅路径，一个打有订阅路径

## 当前还剩什么

`topic-plane` 方向后续仍可继续试：

1. `RuntimeExternalStore` 的 runtime 级通知调度器收敛
2. `topicId` 的最小切面

这两条应另开新刀，不和本刀混做。
