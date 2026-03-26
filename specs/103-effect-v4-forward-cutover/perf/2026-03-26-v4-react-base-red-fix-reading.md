# 2026-03-26 v4 react base-red fix reading

## 背景

- worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.react-base-red-fix`
- branch: `agent/v4-perf-react-base-red-fix-20260326`
- base: `v4-perf@acfa2d45`
- 目标：修掉母线已存在的 `logix-react` 红测，不把 unrelated fix 混进 `#139`

## 失败面

本地稳定复现的失败文件：

- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - `does not dispose ModuleCache when only non-critical config fields change`
  - `does not dispose ModuleCache when gcTime changes`
  - `avoids cache dispose and runtime rebuild during boot-time gcTime churn`
- `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
  - `should re-render for dispatchLowPriority (base runtime has no tick services)`

## 根因结论

### 1. RuntimeProvider config snapshot 缺一笔 ready-after-boot refresh

- 现象：`RuntimeProvider` 初始 sync snapshot 能读到旧值，但挂载期 `useLayoutEffect` 修改 runtime config 后，没有稳定补一笔 ready 后 refresh。
- 结果：`initTimeoutMs` / `gcTime` 的变更停留在 runtime 内存对象里，`RuntimeContext.reactConfigSnapshot` 不更新，`ModuleCache` 也不跟着热更新。
- 命中修复：
  - 在 `RuntimeProvider` ready 后，对当前 `runtimeWithBindings` 补一次异步 `ReactRuntimeConfigSnapshot.load`
  - 只在同一个 runtime 第一次 ready 时触发
  - 若 snapshot 未变化，则维持原 state，不抬 `configVersion`

### 2. ModuleRuntime 在 adapter-injected RuntimeStore 场景里看不到整模块订阅

- 现象：`useSelector(tag)` 走的是 module topic external store，没有 selectorGraph 命中。
- 在 `base runtime has no tick services` 场景里，`RuntimeStore` 只存在于 `RuntimeProvider` 注入的 adapter Env。
- `ModuleRuntime.shouldObservePostCommit()` 原先只看初始化时拿到的 `runtimeStore`，因此会把这类订阅误判成“无需 post-commit observation”。
- 结果：`dispatchLowPriority` 提交后不发 tick，整模块订阅不重渲染。
- 命中修复：
  - 给 `ModuleRuntime` 增加 `runtimeStoreCached`
  - enqueue 时从当前 fiber Env 或 root context 尝试补抓 `RuntimeStore`
  - `shouldObservePostCommit()` 改为读取 `runtimeStoreCached` 的订阅数
  - enqueue 捕获条件收窄为：
    - `runtimeStoreCached` 未命中
    - `tickSchedulerCached` 未命中
    - 或当前确实需要 post-commit observation

## 已排除

- 仅把 `shouldCaptureTickSchedulerAtEnqueue()` 强行改成 `true`，单独不能修好 `dispatchLowPriority`
- 说明问题不只在 tick scheduler，可见性缺口还包含 adapter 注入的 `RuntimeStore`

### 3. RuntimeExternalStore 缺少“隐藏首个 commit”自愈

- 现象：`suspend:true + local ModuleImpl` 首次解除 Suspense 后，组件已经开始订阅，但在订阅建立前发生的自发 state 更新可能没有进入 `RuntimeStore`。
- 结果：
  - `runtimeStore` topic version 不变
  - `RuntimeExternalStore` 继续相信缓存 snapshot
  - 组件会永久停在旧值，例如 `ready=false`
- 命中修复：
  - 给 `RuntimeExternalStore.makeTopicExternalStore` 增加一次性 live-resync 机制
  - 触发条件很窄：`version` 未变化，但 `readLiveSnapshot()` 与已缓存 snapshot 不一致
  - 在首次订阅建立时只补一次 notify + getSnapshot live refresh，不改 steady-state 的正常版本驱动路径

### 4. runtime-yield-to-host 集成测试前提过期

- 现象：测试原先用两个 `NoiseImpl.dispatchLowPriority()` 制造 budget backlog，但 `NoiseImpl` 没有任何订阅。
- 当前 runtime 语义：没有观察者的 module commit 会跳过 post-commit/tick 路径，因此这两条 noise commit 不会进入外层 tick backlog。
- 结果：测试里只能看到 `tickSeq=1 stable=true` 的单次 microtask tick，自然找不到 `forcedMacrotask + reason=budget`。
- 命中修复：
  - 在测试 App 里对两个 noise module 建显式订阅
  - 让 low-priority noise commit 变成真实可观察 backlog，再验证 yield-to-host 断言

## 本地验证

### 原始失败复现

```bash
pnpm -C packages/logix-react test -- \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx
```

修复前结果：

- `runtimeProviderTickServices.regression.test.tsx` 7 条里失败 1 条，为 `dispatchLowPriority`
- `reactConfigRuntimeProvider.test.tsx` 9 条里失败 3 条

### 分项回归

```bash
pnpm -C packages/logix-react test -- test/internal/integration/reactConfigRuntimeProvider.test.tsx
```

结果：`9 passed`

```bash
pnpm -C packages/logix-react test -- test/integration/runtimeProviderTickServices.regression.test.tsx
```

结果：`7 passed`

### 最小提交边界回归

```bash
pnpm -C packages/logix-react test -- \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/internal/RuntimeExternalStore.lowPriority.test.ts
```

结果：`3 files passed, 18 tests passed`

### 第二阶段回归

```bash
pnpm -C packages/logix-react test -- \
  test/Hooks/asyncLocalModuleLocalRuntime.test.tsx \
  test/Hooks/useModuleSuspend.test.tsx
```

结果：`2 files passed, 6 tests passed`

```bash
pnpm -C packages/logix-react test -- test/integration/runtime-yield-to-host.integration.test.tsx
```

结果：`1 file passed, 1 test passed`

```bash
pnpm -C packages/logix-react test -- \
  test/Hooks/asyncLocalModuleLocalRuntime.test.tsx \
  test/Hooks/useModuleSuspend.test.tsx \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/internal/RuntimeExternalStore.lowPriority.test.ts \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx
```

结果：`5 files passed, 24 tests passed`

### 类型门

```bash
pnpm -C packages/logix-react typecheck:test
pnpm -C packages/logix-core typecheck:test
```

结果：均通过

### 扩圈验证

```bash
pnpm -C packages/logix-react test -- \
  test/integration/runtime-yield-to-host.integration.test.tsx \
  test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx
```

结果：`runtime-bootresolve-phase-trace.test.tsx` 8 passed

```bash
pnpm -C packages/logix-core test -- \
  test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts \
  test/internal/Runtime/TickScheduler.correlation.test.ts \
  test/internal/Runtime/TickScheduler.fixpoint.test.ts \
  test/internal/Runtime/TickScheduler.telemetry.test.ts \
  test/internal/Runtime/TickScheduler.topic-classification.test.ts
```

结果：`5 files passed, 15 tests passed`

### package-wide 观察

尝试跑过：

```bash
pnpm -C packages/logix-react test
```

在第一轮跑到中途时确认的 package-wide 既有红：

- `test/Hooks/asyncLocalModuleLocalRuntime.test.tsx`
- `test/integration/runtime-yield-to-host.integration.test.tsx`

其中：

- `asyncLocalModuleLocalRuntime.test.tsx` 在当前修复线和母线 `v4-perf@acfa2d45` 上都失败
- `runtime-yield-to-host.integration.test.tsx` 在当前修复线和母线 `v4-perf@acfa2d45` 上都失败

第一轮对照命令：

```bash
pnpm -C packages/logix-react test -- test/Hooks/asyncLocalModuleLocalRuntime.test.tsx
```

在当前修复线失败；同命令在母线 `v4-perf@acfa2d45` 也失败

随后本轮已把这两条既有红补掉；最终 package-wide 结论见本文件末尾的后续补记

### package-wide 最终收口

重新跑：

```bash
pnpm -C packages/logix-react test
```

最终结果：

- `73 passed`
- `3 skipped`
- `1 failed`

唯一失败项：

- `test/browser/perf-boundaries/converge-steps.test.tsx`
  - `perf hard gate failed: auto<=full*1.05 expected maxLevel=2000`
  - 失败点：`dirtyRootsRatio=0.8`, `steps=2000`

裁决：

- 这条失败属于 `v4-perf@acfa2d45` 既有的 `converge-steps` perf hard gate
- 和本轮 `logix-react` base-red 修复无直接因果关系
- 本轮新增/修复的功能红测已经本地打通，没有再观察到新的功能性回归

## 当前文件边界

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`

对应收口工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-react-base-red-fix.files.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-react-base-red-fix.ready.md`

## 备注

- `reactConfigRuntimeProvider` 仍会打印既有的 render-phase sync blocking warning，但测试通过，且这条 warning 不属于本轮 base-red 根因
- `runtime-bootresolve-phase-trace.test.tsx` 通过，但会打印既有的 `Scope.close failed ManagedRuntime disposed` 调试输出
- `packages/logix-react` 整包最终仍被 `converge-steps` browser perf hard gate 挡住；这与母线已知 perf 主线问题一致
- 当前分支尚未执行 `git add` / `git commit` / `git push`
