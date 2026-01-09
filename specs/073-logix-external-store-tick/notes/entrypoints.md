# Entrypoints（索引）

> 只放“文件/符号/一句话结论”，避免长文。

## Core（@logixjs/core）

- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`：runtime 级单一快照源（tickSeq + topicVersion/priority + topic subscribe）。
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：microtask tick flush + 预算/软降级 + `trace:tick`/`warn:priority-inversion`。
- `packages/logix-core/src/internal/runtime/core/env.ts`：`RuntimeStoreTag/TickSchedulerTag` + 默认 Layer + test stub Layer（T028）。
- `packages/logix-core/src/internal/runtime/AppRuntime.ts`：Runtime Env 组装（关键修复：先 build `baseLayer` 得到 `baseEnv`，再在 `baseEnv` 下 build modules，最后 merge；避免 module fibers 永久缺失 tick services）。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`：模块 init/destroy 注册 moduleInstance；commit 路径接入 TickScheduler/RuntimeStore（含 selector-topic bump，T024）。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`：`dispatchLowPriority` 设置 `commitMode/priority`（低优先级节流来源）。
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`：ReadQuery static lane 增量触发；`onCommit(..., onSelectorChanged?)` 用于 selector-topic version bump（T024/T035）。
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`：`ReadQueryCompiled.lane/readsDigest/selectorId/fallbackReason`（T035 选择 selector-topic 的 gate）。
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：`snapshotToken` 不变量 + microtask 批量通知模式（RuntimeStore 可参考）。
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`trace:*` 事件的轻量化投影与 diagnostics gate（`trace:tick` 走这里）。
- `packages/logix-core/src/Runtime.ts`：对外 Runtime API；`Runtime.batch(() => A)` 提供同步 flush 边界（T021）。
- `packages/logix-core/test/internal/runtime/TickScheduler.fixpoint.test.ts`：fixpoint / budgetExceeded / urgent safety（T026）。
- `packages/logix-core/test/internal/runtime/TickScheduler.diag-gate.test.ts`：diagnostics=off 不产出 trace（T027）。
- `packages/logix-core/test/internal/runtime/TickScheduler.correlation.test.ts`：tickSeq ↔ txnSeq/opSeq 锚点（T029）。
- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`：DeclarativeLinkIR 静态 IR（read nodes 复用 ReadQueryStaticIr）。
- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkRuntime.ts`：DeclarativeLink 最小执行路径（readQuery/static deps → write；txn-window 禁止 IO）。
- `packages/logix-core/test/internal/runtime/DeclarativeLinkIR.boundary.test.ts`：强一致边界（declarative IR vs blackbox）。
- `packages/logix-core/test/internal/runtime/ModuleAsSource.tick.test.ts`：Module-as-Source 跨模块同 tick 稳定化语义（无 tearing）。
- `packages/logix-core/test/internal/runtime/ModuleAsSource.recognizability.test.ts`：Module-as-Source 可识别门禁（moduleId/selectorId/readsDigest）。

## React（@logixjs/react）

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`：runtime 级 topic facade（按 `(runtime, topicKey)` 缓存；listeners=0 detach+delete；保留 low-priority throttling）。
- `packages/logix-react/src/internal/hooks/useSelector.ts`：选择 module-topic vs selector-topic（static lane + readsDigest + 无 fallbackReason 才走 selector-topic）。
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`：Provider 侧持有 runtime 并向 hooks 注入（订阅真相源统一走 RuntimeExternalStore）。
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`：browser 语义门禁（跨模块无 tearing + sharded notify + multi-instance 隔离）。
