# 2026-03-19 · P1-2.2c commit->tick->module-as-source 触发链修复

## 结果分类

- `accepted_with_evidence`

## 已确认根因

- `ModuleRuntime` 的 post-commit 观察门控未覆盖 source 侧两类场景：
  - module-as-source source 模块（无 selector entry、无 runtimeStore subscriber）。
  - external-owned 模块（无 selector entry、无 runtimeStore subscriber）。
- 结果：`onCommit -> TickScheduler.onModuleCommit -> tick flush` 链条被短路，`RuntimeStore` 的 tick 与目标侧 writeback 不推进。

## 修复摘要

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 新增 `hasModuleSourceObservers(moduleInstanceKey)` 判定。
  - 统一门控 `shouldObservePostCommit()`：
    - `externalOwnedFieldPaths.length > 0`
    - `selectorGraph.hasAnyEntries()`
    - `runtimeStore.getModuleSubscriberCount(moduleInstanceKey) > 0`
    - `tickScheduler.hasModuleSourceObservers(moduleInstanceKey)`
  - `shouldCaptureTickSchedulerAtEnqueue` 与 `shouldRunPostCommitObservation` 统一走同一门控，避免 source 侧漏判。
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - 新增 source 观察引用计数：
    - `retainModuleSourceObserver(moduleInstanceKey): () => void`
    - `hasModuleSourceObservers(moduleInstanceKey): boolean`
- `packages/logix-core/src/internal/state-trait/external-store.ts`
  - module-as-source 链接注册时向 `TickScheduler` 申请 source 观察引用。
  - trait 销毁时释放引用，避免泄漏。

## 验证摘要

通过命令 1：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
```

- `ModuleAsSource.tick` 两个断言转绿。
- `StateTrait.ExternalStoreTrait.Runtime` 的 `perf skeleton` 不再 timeout。
- 关键样本：`tickDelta=1`，`finalValues=[100,101,102,103]`。

通过命令 2：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

- 回归门通过，未引入 whole-state fallback 回退。

通过命令 3：

```bash
python3 fabfile.py probe_next_blocker --json
```

- `status=clear`。
- `externalStore.ingest.tickNotify`、`runtimeStore.noTearing.tickNotify`、`form.listScopeCheck` 全部 passed。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-2c-module-source-tick.redlines.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-2c-module-source-tick.probe-next-blocker.json`
