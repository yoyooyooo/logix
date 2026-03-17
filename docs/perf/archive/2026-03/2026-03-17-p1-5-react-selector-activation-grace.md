# 2026-03-17 · P1-5 第一刀：React selector activation grace hold

## 目标

本刀只切 React 侧 selector external store 的 activation 生命周期：

- 聚焦 `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- 目标链路是 `getRuntimeReadQueryExternalStore(...) -> changesReadQueryWithMeta(...) -> Stream.runDrain(...)`
- 只处理“最后一个 listener 释放后，短空窗重挂导致 activation 反复启停”的抖动

本刀明确不做：

- 不重写 `SelectorGraph`
- 不下沉新的 public API
- 不改 `ModuleRuntime.impl.ts` / `SelectorGraph.ts`

## baseline

先验证用户要求的 baseline：

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx
```

结果：

- 通过
- 旧文件共 `2` 个测试全绿

## RED

新增守门：

- `packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`
  - `keeps readQuery activation alive across a short listener gap`

RED 命令：

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx
```

当前 `HEAD` 下先失败，失败点直接命中目标切面：

- 首次 mount 后 `activationStartCount = 1`
- 最后一个 listener 释放，跨过一次微任务后立刻 remount
- 旧实现会再次调用 `changesReadQueryWithMeta(...)`
- 断言期望 `1`，实际为 `2`

这说明旧逻辑只用微任务持有 store，无法吸收“短 listener gap”里的 selector activation 抖动。

## 实现

代码落点：

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

实现点：

1. 给 `makeTopicExternalStore(...)` 增加内部 `teardownDelayMs`
2. 只在 readQuery external store 上启用 `READ_QUERY_ACTIVATION_GRACE_MS = 16`
3. 最后一个 listener 释放后，不再在微任务里立刻：
   - interrupt `readQueryDrainFiber`
   - 取消 runtime-store topic 订阅
   - 从 runtime store cache 删除 selector store
4. 若在 `16ms` grace window 内重新订阅：
   - 取消 teardown
   - 复用已有 activation / store / topic 订阅

附带修正：

- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - 把现有 `React.useRef<any>()` 补成 `React.useRef<any>(undefined)`，用于打通 React 19 下的 `typecheck:test`

## 验证

### 相关回归

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useSelector.sharedSubscription.test.tsx \
  test/Hooks/useSelector.laneSubscription.test.tsx \
  test/Hooks/useSelector.structMemo.test.tsx
```

结果：

- `3` 个文件全部通过
- `5` 个测试全部通过

### 类型门

```bash
pnpm -C packages/logix-react typecheck:test
```

结果：

- 通过

## targeted perf

新增贴边 micro-bench：

- `packages/logix-react/test/Hooks/useSelector.sharedActivation.microbench.ts`

命令：

```bash
pnpm exec tsx packages/logix-react/test/Hooks/useSelector.sharedActivation.microbench.ts
```

测量口径：

- same-code A/B，对比的是 activation 策略，不是两个 worktree
- `current`
  - 走当前 `getRuntimeReadQueryExternalStore(...)`
  - `readQuery activation grace = 16ms`
- `baseline`
  - 在同一份代码里用旧语义做局部仿真
  - 最后一个 listener 释放后只用微任务持有，立即 teardown
- 两侧都跑同一组 subscribe/unsubscribe 循环
- 不引入 React render 噪声，只量 external store activation 启停本身

参数：

- `warmupCycles = 200`
- `cycles = 2000`
- `rounds = 5`

输出摘要：

- `current`
  - `meanMs = 1.614ms`
  - `warmupActivationStarts = 1 / round`
  - `measuredActivationStarts = 0 / round`
- `baseline`
  - `meanMs = 33.140ms`
  - `warmupActivationStarts = 200 / round`
  - `measuredActivationStarts = 2000 / round`

解释：

1. `current` 在 warmup 只支付一次冷启动
2. 进入测量窗口后，`2000` 轮短 gap 重挂没有任何 activation restart
3. `baseline` 则在每一轮都重启一次 activation
4. steady-state 循环总耗时从 `33.140ms` 降到 `1.614ms`
   - 约 `20.5x` 更快

这条 bench 直接命中本刀要省掉的那笔成本：

- `changesReadQueryWithMeta(...)`
- `Stream.runDrain(...)`
- `Fiber.interrupt(...)`
- selector store / runtime-store topic 的重复启停

## 结论

分类：

- `accepted_with_evidence`

理由：

1. RED 先失败，失败点直接命中 selector activation 二次启动
2. 实现范围只落在 `RuntimeExternalStore.ts`
3. 相关回归与 `typecheck:test` 全绿
4. targeted micro-bench 对目标路径给出稳定、数量级明确的正收益
