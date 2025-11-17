# 证据地图（代码落点与调用链路）

本文档是 `docs/reviews/*` 的“导航与证据入口”：把 `@logix/core` 的公共出口、运行时装配链路、事务/trait/诊断/React/Sandbox 的关键文件与符号串成一张可交接地图，方便后续做不兼容重构时逐点落地与验证。

## 1) `@logix/core` 公共出口地图（以 `packages/logix-core/src/index.ts` 为准）

`packages/logix-core/src/index.ts` 以命名空间形式对外导出：

- `Module`：`packages/logix-core/src/Module.ts`
  - `Module.make(...)` → `internal/runtime/ModuleFactory.ts::Module(...)`
  - `ModuleTag.logic(($)=>...)`（`Module.make(...)` 返回值的 `.tag`）：在 Logic Effect 内 `yield* moduleTag` 获取 runtime，再 `BoundApiRuntime.make(...)` 构造 `$`
  - 重要漂移：`def.traits` 注释写“运行时尚未消费”，但实际会 `StateTrait.build(...)` 并自动注入安装逻辑（详见 `Module.ts`）
- `Logic`：`packages/logix-core/src/Logic.ts`
  - `RuntimeTag = Context.GenericTag("@logix/Runtime")`：**当前仅定义未使用**（仓库内唯一引用就是它自身）
  - 其余均为 `internal/runtime/core/LogicMiddleware.ts` 的类型/实现别名与 re-export
- `Bound`：`packages/logix-core/src/Bound.ts`
  - 类型：`BoundApiPublic` / `RemoteBoundApi` / `ActionsApi`
  - 工厂：`Bound.make(shape, runtime)` → `internal/runtime/BoundApiRuntime.ts::make(...)`
  - 高风险：`state.ref()` 暴露 `SubscriptionRef`（可写逃逸，详见第 4 节）
- `Flow`：`packages/logix-core/src/Flow.ts`（薄 re-export，实际运行时：`internal/runtime/core/FlowRuntime.ts`）
- `MatchBuilder`：`packages/logix-core/src/MatchBuilder.ts`（薄 re-export，实际：`internal/runtime/core/MatchBuilder.ts`）
- `Runtime`：`packages/logix-core/src/Runtime.ts`
  - 组装 App Runtime：`internal/runtime/AppRuntime.ts::makeApp(...)`
  - Devtools/Observer/Middleware 注入：`internal/runtime/EffectOpCore.ts::EffectOpMiddlewareTag`
  - time-travel：`Runtime.applyTransactionSnapshot(...)` → `ModuleRuntime.getRuntimeByModuleAndInstance(...)`
- `Debug`：`packages/logix-core/src/Debug.ts`
  - 事件模型：`internal/runtime/core/DebugSink.ts`
  - Hub：`internal/runtime/core/DevtoolsHub.ts`
  - Devtools enable 开关：`Debug.isDevtoolsEnabled`
- `Platform`：`packages/logix-core/src/Platform.ts`
  - 平台 Service：`internal/runtime/core/Platform.ts`（注意：Tag 使用 `Context.GenericTag("@logix/Platform")`）
  - 默认实现：`NoopPlatformLayer`
- `Resource`：`packages/logix-core/src/Resource.ts`
  - `ResourceRegistryTag`：使用 **class Tag**（与 core 内大量 `GenericTag` 混用）
  - `Resource.layer(...)`：dev 环境做重复 id 检测
- `StateTrait`：`packages/logix-core/src/StateTrait.ts`
  - DSL：`computed/source/link/node/list/from`
  - 编译：`internal/state-trait/build.ts`
  - 安装：`internal/state-trait/install.ts`
- `TraitLifecycle`：`packages/logix-core/src/TraitLifecycle.ts`（Phase 2 占位）
- `Env`：`packages/logix-core/src/Env.ts`

边界约束：`packages/logix-core/package.json` 明确 `./internal/*: null`，意味着 **internal 不是公共 API**；review 中提到的 internal 入口必须通过“公共 API 收敛/降级”来落地。

## 2) 运行时装配链路（Module → Layer → AppRuntime）

核心路径（从“能跑起来”到“可扩展”）：

- `internal/runtime/ModuleFactory.ts::Module(id, def)`
  - 创建 Module Tag：`Context.GenericTag(\`@logix/Module/${id}\`)`
  - `logic(build)`：运行时从 Env `yield* tag` 拿到 runtime，再 `BoundApiRuntime.make(shape, runtime, options)` 生成 `$`
  - `live(initial, ...logics)`：`Layer.scoped(tag, ModuleRuntime.make(initial, {...}))`
  - `implement(config)`：生成 `ModuleImpl` 蓝图（imports/processes/stateTransaction 等）
- `internal/runtime/ModuleRuntime.ts::make(initial, options)`
  - 单实例 FIFO：`txnQueue` + `enqueueTransaction`
  - 统一事务：`runWithStateTransaction(origin, body)` → `StateTransaction.beginTransaction/commit`
  - 事务内 converge/validate/source-sync：在 commit 前统一执行（见第 3/5 节）
- `internal/runtime/AppRuntime.ts::makeApp(config)`
  - 先做 Tag collision 检测（`validateTags` / `getTagKey`）
  - 合并 app layer 与 module layers，`Layer.buildWithScope` 后用 `diffFiberRefs` 回灌 FiberRef patch
  - fork `processes`（长期流程：Link/桥接等）
  - 输出 `ManagedRuntime.make(finalLayer)`

public `Runtime.make(...)`（`packages/logix-core/src/Runtime.ts`）本质是对 `AppRuntime.makeApp(...)` 的高级封装（增加 devtools、middleware、runtimeLabel、stateTransaction runtime 默认配置等）。

## 3) 事务引擎与 “`path=\"*\"` 退化点”

事务与 patch/dirty-set 的关键结构：

- `internal/runtime/core/StateTransaction.ts`
  - `beginTransaction(...)` 生成 `txnId = ${instanceId}::t${txnSeq}`（确定性派生；`startedAt` 仅作为时间字段）
  - `updateDraft(ctx, next, patch?)`：只有传入 patch 才会把 `patch.path` 记入 `dirtyPaths`
  - `recordPatch(ctx, patch)`：同时记 dirty path；full instrumentation 才保存 `patches[]`
- `internal/runtime/ModuleRuntime.ts`
  - `setStateInternal(next, patch)`：事务内仅 `updateDraft`，事务外会入队并开启事务
  - 当前把大量写入统一记为 `path: "*"`：
    - primary reducer：`reason: "reducer", path: "*"`
    - `runtime.setState`：`reason: "state:set", path: "*"`
    - devtools time-travel：`reason: "devtools", path: "*"`

这三处会把 `dirtyPaths` 的信息质量打回 `*`，直接让 trait 的 dirty converge 退化为“近似全量”。

## 4) 可写 `SubscriptionRef` 逃逸点（绕过事务/诊断/trait）

逃逸入口（公共可见）：

- `BoundApiPublic.state.ref(...)`：`packages/logix-core/src/Bound.ts`
- `ModuleRuntime.ref(...)`：`internal/runtime/core/module.ts`（接口定义）+ `internal/runtime/ModuleRuntime.ts`（实现）
  - 无 selector：返回底层 `stateRef`（可写）
  - 有 selector：构造“只读派生 ref”（`modify` 会 `dieMessage`，防写）

为什么它致命：

- `SubscriptionRef.update/set` 直接写底层 ref，不经过 `txnQueue/runWithStateTransaction`，因此：
  - 不触发 `StateTransaction`（无 txnId / 无 patches / 无 dirtyPaths）
  - 不触发 `StateTraitConverge/Validate/Source` 的事务闭包
  - 不产生一致的 `Debug.record({type:"state:update"})`
  - 甚至可能与事务 draft 产生竞态/覆盖（事务 commit 会回写 draft）

证据入口（示例中已有直写）：`examples/logix/src/patterns/long-task.ts`、`examples/logix/src/scenarios/and-update-on-changes.ts`、`examples/logix/src/scenarios/long-task-from-pattern.ts`。

## 5) Trait（Program/Graph/Plan）与事务内收敛

Trait 编译/执行链路：

- 公共 DSL：`packages/logix-core/src/StateTrait.ts`
- 结构模型：`internal/state-trait/model.ts`
- build：`internal/state-trait/build.ts`（生成 Program/Graph/Plan，含冲突检测雏形）
- converge：`internal/state-trait/converge.ts`
  - `convergeInTransaction(program, ctx)` 支持 `mode: "dirty"`，并对 dirtyPaths 做 `normalizeDirtyPath(...)`
  - overlap 规则支持前缀与数组索引归一（`a === b` / `a.startsWith(b+".")`）
- source：`internal/state-trait/source.ts`（keyHash gate / 并发 / replay）
- validate：`internal/state-trait/validate.ts`
- install：`internal/state-trait/install.ts`
  - 重要：install 阶段主要注册 `source-refresh`；computed/link/check 的执行已迁移到事务内 converge/validate

运行时触发点：

- `Module.ts` 在 `def.traits` 存在时会 `StateTrait.build(...)` 并包装 `implement(...)` 自动注入 “trait install logic”
- `ModuleRuntime.ts` 在 `runWithStateTransaction` 的 commit 前调用：
  - `StateTraitConverge.convergeInTransaction(...)`
  - `StateTraitValidate.validateInTransaction(...)`
  - `StateTraitSource.syncIdleInTransaction(...)`

## 6) 多实例/作用域语义：core fallback vs react strict

core 的注册/解析（008）：

- `internal/runtime/ModuleRuntime.ts`
  - `runtimeRegistry`：仅用于 devtools/内部调试定位，不承载解析语义（禁止作为 fallback）
  - `__importsScope`：每个模块实例 scope 的最小 injector（ModuleToken → ModuleRuntime），用于 strict 子模块解析
- `internal/runtime/BoundApiRuntime.ts::resolveModuleRuntime(...)`
  - strict-only：优先 `Effect.serviceOption(tag)`；缺失提供者直接抛 `MissingModuleRuntimeError`（dev/test 带 fix 建议）

react 的 imports-scope 解析（strict-only）：

- `packages/logix-react/src/internal/resolveImportedModuleRef.ts`：从 `parentRuntime.__importsScope` 解析子模块；缺失抛 `MissingImportedModuleError`

## 7) 诊断/Devtools/EffectOp 关键入口

- Debug 事件模型：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - `Debug.currentTxnId` FiberRef、`lastTxnByInstance` 兜底对齐 React trace
- Hub：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（ring buffer + snapshot）
- EffectOp 总线：
  - 模型：`packages/logix-core/src/EffectOp.ts`
  - 运行：`packages/logix-core/src/internal/runtime/EffectOpCore.ts`
  - `linkId`：默认复用 FiberRef（边界起点回退到 `op.id`，由 `instanceId + opSeq` 确定性派生）
- Replay：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`
  - `ModuleRuntime.__recordReplayEvent` 将 replay 事件挂到 txn，供 `state:update` 关联

## 8) Sandbox（Playground/Alignment Lab）当前契约落点

- 编译器：`packages/logix-sandbox/src/compiler.ts`
  - `esbuild-wasm` + `cdnResolvePlugin`
  - `effect@3.19.8` 与所有裸 specifier 默认 external 到 `https://esm.sh/*`
  - `@logix/core` external 到 `kernelUrl`（由 INIT 注入）
- Worker：`packages/logix-sandbox/src/worker/sandbox.worker.ts`
  - 支持命令：INIT/COMPILE/RUN/UI_CALLBACK/TERMINATE
  - `RUN`：把 bundle Blob import 后，要求 `default` 导出为 Effect 程序并 `runPromise`
  - Debug 集成：仅尝试注入 `logix.Debug.internal.currentDebugSinks`，把 `trace:*` 转成 `TRACE` span（未桥接 DevtoolsHub/StateTransaction/IR）
  - 关键缺口：`RunCommand.payload.actions` 当前未消费；`TERMINATE` 无法取消运行中的 Effect；UI_CALLBACK 仅记录事件不回传到用户程序
- Host Client：`packages/logix-sandbox/src/Client.ts`
  - logs/traces/uiIntents 为无上界数组（长期运行会内存膨胀）

## 9) Tag/Identity 混用点（影响冲突检测与多实例语义）

可作为“需要统一策略”的证据入口：

- `Context.GenericTag`（core 内部仍大量使用）：
  - `packages/logix-core/src/internal/runtime/ModuleFactory.ts`（module tag）
  - `packages/logix-core/src/internal/runtime/core/Platform.ts`（Platform.Tag）
  - `packages/logix-core/src/internal/runtime/core/Lifecycle.ts`（LifecycleContext）
  - `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`（LogicPhaseServiceTag）
  - `packages/logix-core/src/Logic.ts`（RuntimeTag，且当前无装配/无使用）
- class Tag（部分新代码已采用）：
  - `packages/logix-core/src/internal/runtime/EffectOpCore.ts`（EffectOpMiddlewareTag）
  - `packages/logix-core/src/Resource.ts`（ResourceRegistryTag）
  - `packages/logix-sandbox/src/Service.ts`（SandboxClientTag）

## 10) 值得继续深挖的“漂移/遗留/向后兼容点”（优先级建议）

1. `Logic.RuntimeTag` 存在但仓库内完全未使用/未装配（`rg "@logix/Runtime"` 仅命中 `Logic.ts`）
2. `Bound.ts` 注释仍写“默认基于 RuntimeTag 获取 runtime”，但实际工厂 `Bound.make(shape, runtime)` 必须显式传入 runtime
3. `Module.make({ traits })` 注释写“尚未消费”，但实际会 build/注册/自动注入 install（属于 SSoT 漂移）
4. 业务可写 `state.ref()`/`runtime.ref()` 逃逸，绕过事务闭包与诊断（导致性能与因果不可控）
5. `path="*"` 大面积存在，导致 dirty converge 基本退化（事务+trait “智能化优化”无法兑现）
6. core 的全局 runtime registry fallback 与 react strict imports-scope 语义冲突（典型“便利性/兼容性遗留”）
7. （已完成）runtime/txn/effectop 的 id 已去随机化：以 `instanceId + txnSeq + opSeq (+ eventSeq)` 为主，id 由序号确定性派生
8. Sandbox：`RUN.actions` 未实现、`TERMINATE` 不可取消、logs/traces 无 ring buffer（契约与性能都需补齐）
9. Tag 体系混用（GenericTag vs class Tag）与 key/冲突检测策略未统一（影响多实例隔离与诊断分组）
10. 只读派生 `SubscriptionRef` 通过 “伪实现 + 强制 cast” 达成（可能破坏 effect 内部约定；需要正式的 readonly ref 抽象）
