---
title: Env/Layer 注入与 override 陷阱：build-time capture、root singletons、分层 patch 教程 · 剧本集
status: draft
version: 1
---

# Env/Layer 注入与 override 陷阱：build-time capture、root singletons、分层 patch 教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Logix 的 Env/Layer 注入语义、override 的可预测边界、以及最常见的坑（build-time capture / root singleton 误用 / 分层 patch 顺序错误）讲清楚。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先把坑避开）

1. Runtime 容器与 DI 口径（SSoT）：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
2. Bound API：strict vs root（SSoT）：`docs/ssot/runtime/logix-core/api/03-logic-and-flow.01-bound-api.md`
3. React DI 与入口（SSoT）：`docs/ssot/runtime/logix-react/01-react-integration.04-di-and-entry.md`
4. 实现小抄（build-time capture 必读）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`
5. AppRuntime 装配（RootContext ready / build 顺序）：`packages/logix-core/src/internal/runtime/AppRuntime.ts`

---

## 1. 心智模型：Layer 是 build-time 注入；Env 合并不是“把依赖喂给已构造服务”

如果你只记住一句话，就记住这一句：

> **Layer 是 build-time 依赖注入**：服务在 `Layer.build` 时被构造并闭包捕获其依赖（`yield* Tag`）；最终 Env 合并（`Layer.mergeAll`）不等于“把依赖喂给已经构造好的服务”。

这条语义是很多 “override 失效/偶发缺依赖/测试 flaky” 的根因。

### 1.1 三种“注入入口”的语义差异（必须区分）

1. **ModuleImpl / imports（strict 子实例）**
   - 语义：父模块实例 scope 内显式导入子模块实例（`imports: [Child.impl]`）。
   - 入口：Logic 内 `yield* $.use(ChildModule)`（strict）。

2. **Runtime Tree root provider（root singletons）**
   - 语义：跨模块/跨实例的 “root 单例” 读取（ServiceTag/ModuleTag）。
   - 入口：Logic 内 `yield* $.root.resolve(Tag)` 或 Effect 边界 `Logix.Root.resolve(Tag)`。
   - 关键：**不受**更近 scope 的 `RuntimeProvider.layer` 影响（它是“固定 root”语义）。

3. **React RuntimeProvider.layer（当前运行环境单例 / 局部覆写）**
   - 语义：在 React 子树内追加/覆写 Env（nearest wins），影响 `useModule(ModuleTag)` 等“当前运行环境单例”入口。
   - 关键：它不是 root provider；不要指望它能“mock Root.resolve”。

你可以把这三者理解成：**strict（实例内）** / **root（跨树）** / **react env（就近覆写）**。

### 1.2 strict vs root：为什么说“root 是显式的特权入口”

`$.use(...)` 默认 strict，是为了让依赖关系可诊断、可回归：

- 子模块实例属于哪个父实例（imports scope）是确定的；
- 缺失即失败，错误信息会指向 wiring（而不是静默拿到一个错误的单例）。

而 `Root.resolve(Tag)` 是显式特权入口，它表达的是：

- “我刻意要 root 单例（跨树/跨实例）”
- “我接受它忽略局部 override（例如 React 的内层 RuntimeProvider.layer）”

因此：只有在**确实是全局单例语义**的能力（i18n/auth/analytics/全局配置）才用 root；否则尽量用 strict + imports（更可测试、更不易漂移）。

---

## 2. 核心链路（从 0 到 1）：AppRuntime 如何装配 Env，为什么 build 顺序是硬约束

这里用 AppRuntime 的真实实现来解释“分层 patch”与 build-time capture 的本质（你未来排查 80% DI 问题都要回到这里）。

实现入口：`packages/logix-core/src/internal/runtime/AppRuntime.ts`

### 2.1 baseLayer：tickServices 先建，再喂给 appLayer

AppRuntime 会先构造 `tickServicesLayer`（HostScheduler/RuntimeStore/DeclarativeLinkRuntime/TickScheduler），然后：

- `appLayer = config.layer.pipe(Layer.provide(tickServicesLayer))`
- `baseLayer = Layer.mergeAll(tickServicesLayer, appLayer, pinnedHostSchedulerLayer?, ... , RootContextTag, ProcessRuntime.layer(), ...)`

这里的关键点是：**先提供再合并**：

- `Layer.provide(tickServicesLayer)(config.layer)` 的语义是“在 build `config.layer` 时，tickServices 已可见”；
- 单纯 `Layer.mergeAll(config.layer, tickServicesLayer)` 并不能保证 `config.layer` build 时能拿到 tickServices（捕获语义会让它偶发失败/漂移）。

### 2.2 073 的硬约束：先 build baseLayer，再在 baseEnv 下 build module layers

AppRuntime 在源码里写了一个非常“硬”的注释（强烈建议你直接读）：它指出如果 build 顺序错了，会出现长期 fiber 捕获半成品 Env 的问题。

真实行为（简化）：

1. `baseEnv = Layer.buildWithScope(baseLayer, scope)`
2. `moduleEnv = Layer.buildWithScope(modulesLayer, scope)` **在 `Effect.provide(..., baseEnv)` 下进行**
3. `mergedEnv = Context.merge(baseEnv, moduleEnv)`
4. 填充 RootContext：`rootContext.context = mergedEnv` + `Deferred.succeed(rootContext.ready, mergedEnv)`
5. Env ready 后再启动 processes（避免“未 ready 就 fork”）

这条顺序为什么必须如此：

- 模块初始化/logic/process 可能会 fork 长期 fiber；
- fiber 一旦在半成品 Env 下启动，就会“永久看不到”后来才 merge 进来的服务（典型：TickScheduler/RuntimeStore/RootContext）；
- 所以必须先把 baseline runtime services 建好，再让模块/逻辑在完整 Env 下启动。

### 2.3 RootContext ready：为什么 Root.resolve 默认不 wait

`Logix.Root.resolve` 的实现：`packages/logix-core/src/internal/root.ts`

要点：

- RootContext 由 AppRuntime 注入，且只有在 Env build 完成后才会 `ready`。
- `Root.resolve(...,{ waitForReady })` 默认 `waitForReady=false`，目的是**避免在 setup/layer 阶段误用**导致死锁。
- Logic 内的 `$.root.resolve` 会在 run 阶段（run-only）按需打开 wait（见 SSoT Bound API 文档）。

因此：如果你发现自己在“构造 Layer / module 定义”阶段想去 resolve root 单例，基本就是设计味道不对——应该把那段逻辑挪到 run 阶段，或用 strict/imports 表达。

---

## 3. 剧本集（用例驱动）

### 3.1 build-time capture：为什么“最后 merge 一个 override layer”经常无效

最典型的例子：TickScheduler 捕获 HostScheduler。

你常见的“看起来合理但其实错”的写法：

- `Layer.mergeAll(testHostSchedulerLayer(host), tickSchedulerTestLayer(config))`

为什么错（核心原因）：

- `tickSchedulerLayer` build 时会 `yield* HostSchedulerTag`，把当时看到的 scheduler 闭包捕获；
- 你后续 merge/override 只是改变最终 Context，不会回溯改变 TickScheduler 内部已经捕获的 scheduler。

正确写法（“先 provide 再 merge”）在 impl 小抄里有完整范式：

- `docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`

如果你不想记住这些细节，最推荐的“避坑入口”是：

- `Logix.Runtime.make(root, { hostScheduler })`（在 Runtime 构造期一次性注入）

### 3.2 我想 mock Root 单例：为什么嵌套 `RuntimeProvider.layer` 没用

这是最常见的误解之一。

- `Root.resolve(Tag)` 的语义是：固定从 root provider 解析（`RootContextTag.context`），**忽略**更近 scope 的 override。
- React 的 `RuntimeProvider.layer` 只影响“当前运行环境（nearest wins）”路径，例如 `useModule(ModuleTag)`。

所以你看到的错误通常会明确提示：

- `packages/logix-core/src/internal/root.ts`：`MissingRootProviderError` 的 fix 列表里写了 “Do not rely on nested RuntimeProvider.layer to mock Root.resolve.”

正确修复：

- 在构造 runtime tree 时注入（`Logix.Runtime.make(root, { layer })` / `ManagedRuntime.make(Layer.mergeAll(...))`）；
- 或在测试里用 `Logix.Root.layerFromContext(context)` 提供一个 “ready immediately” 的 RootContext（tests/perf only）。

### 3.3 strict imports vs root singletons：两种缺依赖错误的不同修复方式

典型报错 1：`MissingModuleRuntimeError`（strict 模式缺子模块实例）

触发：Logic 内 `yield* $.use(ChildModule)`，但父模块没有 `imports: [Child.impl]`。  
修复：按错误提示把 child impl 加到同 scope 的 imports（见 `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` 的 fix 文案）。

典型报错 2：`MissingRootProviderError`（root 模式缺单例）

触发：Logic 内 `yield* $.root.resolve(Tag)`，但 root provider 没提供该 Tag。  
修复：把对应 Layer 提供到 runtime tree 根（`Runtime.make(...,{ layer })` 或最外层 `RuntimeProvider runtime={...} layer={...}`），不要指望用局部 `RuntimeProvider.layer` 解决。

### 3.4 ModuleImpl.withLayer 的“分层 patch”语义：为什么它不是简单 merge

实现口径见：`docs/ssot/runtime/logix-core/impl/README.06-moduleimpl.md`

`withLayer(extra)` 的关键不是“把 extra 合到最终 Env”，而是两步：

1. 先 `Layer.provide(extra)` 给 ModuleRuntime 构造逻辑（让逻辑在 build 时能拿到依赖）
2. 再 `Layer.mergeAll(provided, extra)` 把 extra 本身挂到最终 Context（外部也可读取）

这就是分层 patch 的典型范式：**先喂给 build，再挂到结果**。

### 3.5 React RuntimeProvider.layer 的硬约束：它必须是 closed env（R=never）

实现注释在：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`

核心原因：

- React 树内的 Provider 叠加应该是“增强/覆写已存在的 Env”，而不是引入新的未满足依赖；
- 否则你会得到“看起来能用但某些子树/某些时机缺服务”的灾难（并且极难诊断）。

因此：

- “需要依赖的平台服务/全局服务”请在 runtime tree 构造期提供（root layer）；
- “局部覆写/局部 module”可以用 `RuntimeProvider layer={...}`。

---

## 4. 代码锚点（Code Anchors）

### 4.1 Root / strict / error hints

- `packages/logix-core/src/Root.ts`：`Root.resolve` / `layerFromContext`
- `packages/logix-core/src/internal/root.ts`：RootContext ready + `MissingRootProviderError`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`：`MissingModuleRuntimeError` 的 strict/imports 语义与 fix 文案
- `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`：React 侧 strict imports 解析与 `MissingImportedModuleError` 的 fix 文案

### 4.2 AppRuntime env assembly（build 顺序的事实源）

- `packages/logix-core/src/internal/runtime/AppRuntime.ts`：baseLayer/moduleEnv/RootContext ready/process install
- `packages/logix-core/src/internal/runtime/core/env.ts`：HostSchedulerTag/tickSchedulerLayer 等（capture 发生处）
- `packages/logix-core/src/internal/InternalContracts.ts`：tickServicesLayer、test stub layers、deterministic scheduler

### 4.3 React Provider

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`：layer 注入与 runtime adapter（闭包捕获/缓存/错误链路）
- `docs/ssot/runtime/logix-react/01-react-integration.04-di-and-entry.md`：React 侧 DI 推荐模式（Fractal Runtime）

---

## 5. 验证方式（Evidence）

建议从“能证明 override 语义正确”的测试入手：

- build-time capture / hostScheduler：优先按 `docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md` 的锚点回归相关测试
- strict imports 缺失提示：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`（若你改动了 imports 语义，必须跑）

（如何跑一次性测试见：`docs/ssot/handbook/playbooks/quality-gates.md`）

---

## 6. 常见坑（Anti-patterns）

1. **把 `Layer.mergeAll` 当成“注入”**：merge 只合结果，不保证 build 时可见；需要 `Layer.provide` 或在构造期注入（Runtime.make hostScheduler）。
2. **用 `Root.resolve` 解决所有依赖**：会破坏 strict/imports 的实例语义与可测试性；root 只用于真正的全局单例。
3. **指望 `RuntimeProvider.layer` mock Root 单例**：Root.resolve 固定读 root provider，必须在 runtime tree 根提供。
4. **在 setup/layer 阶段等待 root ready**：容易死锁；Root.resolve 默认不 wait 是为了拦住误用。
5. **先初始化模块再补齐 tick services**：长期 fiber 会捕获半成品 Env，后续补齐无效；必须按 AppRuntime 的 build 顺序装配。

