---
title: Runtime 组合根与装配闭环 教程 · 剧本集（ModuleImpl → Root Provider → Runtime.make）
status: draft
version: 1
---

# Runtime 组合根与装配闭环 教程 · 剧本集（ModuleImpl → Root Provider → Runtime.make）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把“如何把系统正确跑起来”这条链路讲透，并让 wiring 错误（imports/root/link/layer）变得可解释、可验证、可移交。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

本文聚焦三件事：

1. **组合根（Composition Root）** 的职责边界：Root 应该装配什么，不应该塞什么。
2. `Logix.Runtime.make(...)` 从 Root 蓝图装配出一颗 Runtime Tree 的关键语义（含 Root provider、tick services、process install）。
3. 高频 wiring 错误的“症状 → 证据 → 修复”剧本：`MissingModuleRuntimeError` / `MissingRootProviderError` / `TagCollisionError`。

---

## 0. 最短阅读路径（10–20 分钟先能把项目跑起来）

如果你只想快速建立正确的装配心智，按这个顺序：

1. Runtime Container 口径（SSoT）：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
2. 黄金链路（面向工程实践）：`docs/ssot/platform/appendix/logix-best-practices/README.md`（2.*）
3. public 入口：`packages/logix-core/src/Runtime.ts`（`make`）
4. Root provider 入口：`packages/logix-core/src/Root.ts`（`resolve`）
5. 直接读“可运行教程”测试：
   - strict imports：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
   - Root.resolve 语义：`packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.root-provider.test.ts`
   - Root.resolve 语法糖：`packages/logix-core/test/Bound/BoundApi.RootResolveSugar.test.ts`
   - Tag collision：`packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`
   - assembly failure 诊断：`packages/logix-core/test/ErrorHandling/ErrorHandling.AssemblyFailure.test.ts`

---

## 1. 心智模型：把这些名词放进同一个坐标系

### 1.1 “五件套”黄金链路（定义 → 蓝图 → 装配 → 容器 → 运行）

你可以把业务工程里真正需要掌握的东西压缩成五个概念：

1. **ModuleDef**（纯定义）：`Logix.Module.make(id, { state, actions })`
2. **Logic**（可组合单元）：`Module.logic(($) => Effect.gen(...))`
3. **ModuleImpl（蓝图）**：`ModuleDef.implement({ initial, logics, imports, processes, stateTransaction })`
4. **Root（Composition Root）**：一个 ModuleImpl（或 Module）作为入口，负责装配：imports/processes/layer
5. **Runtime（运行容器）**：`Logix.Runtime.make(root, { layer, ... })` 返回 `ManagedRuntime`

重要直觉：

- **Root 是“装配”，不是“业务逻辑”**：装配做对了，绝大多数“模块解析/注入/隔离”问题会自动消失。
- Root 一旦混入业务逻辑，会带来两种隐性税：
  - 测试难（因为 wiring 与业务耦合，难 mock/难隔离）
  - 平台化难（因为出码/解释/回放需要稳定结构，而不是随机散落在装配代码里）

### 1.2 模块解析三分法（imports / root / link）

这条裁决在教程 07 已写过，这里只重复最关键一句：

> **imports（strict）/ root（global）/ link（显式胶水）** 是三条互斥的语义通道；不要混用，也不要 fallback。

推荐先读：`docs/ssot/handbook/tutorials/07-module-graph-and-collaboration.md`

对应的三个入口分别是：

- imports（strict）：`yield* $.use(Child.tag)`（缺失即 `MissingModuleRuntimeError`）
- root（global）：`yield* $.root.resolve(ServiceTag)` / `Logix.Root.resolve(ServiceTag)`（缺失即 `MissingRootProviderError`）
- link（显式胶水）：`Logix.Process.link(...)` / `Logix.Process.linkDeclarative(...)`

### 1.3 Root provider 是“固定 root”，不是“nearest wins”

常见误解：把 `Root.resolve` 当成“Effect 的最近注入 wins”。

事实相反：Root provider 的设计目标是 **消灭“隐式 nearest-wins”带来的随机性**，把“要不要拿 root 单例”变成一个显式入口：

- `$.use(Tag)`：strict，解析 imports scope
- `Root.resolve(Tag)`：global，解析 root provider（忽略局部 override）
- `RuntimeProvider.layer` / `Effect.provideService`：nearest wins（只影响“当前运行环境”的解析，不影响 root provider）

---

## 2. 核心链路（从 0 到 1：写 Root → make Runtime → 跑起来）

### 2.1 写一个 Root ModuleImpl（只装配 3 个东西）

一个“健康的 Root”通常只做三件事：

1. **imports**：引入子模块实现（`Child.impl`）与必要的 Service Layer
2. **processes**：挂长期进程（Process/Link/host bridge），避免让业务逻辑散落到宿主
3. **layer**：闭合 Env（`Layer.mergeAll(...)`），把需要的 Tag 服务提供齐

示例写法（只展示结构，不追求可复制运行）：

```ts
const Root = Logix.Module.make('Root', { state: RootState, actions: RootActions })

const RootLogic = Root.logic(($) => Effect.void)

const RootModule = Root.implement({
  initial: { /* ... */ },
  logics: [RootLogic],
  imports: [
    Child.impl,         // 子模块蓝图
    SomeService.Live,   // Service Layer（如 HTTP client / storage / region）
  ],
  processes: [
    Logix.Process.link({ modules: [A, B] }, ($) => Effect.void),
  ],
})

export const runtime = Logix.Runtime.make(RootModule, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
})
```

### 2.2 Runtime.make 到底做了什么（关键语义）

public 入口：`packages/logix-core/src/Runtime.ts` → `make(...)`

你可以把 `Runtime.make` 理解为：

> 用 “root impl + app layer” 构造一个 app 级 Env，然后在这个 Env 下实例化 modules，并在 Scope 内安装所有 processes，最终返回一个可运行的 ManagedRuntime。

关键点（按真实实现的“必要性”排序）：

1. **合成 app layer（含 Debug/Devtools/EffectOp middleware 等）**  
   - `Runtime.make` 会把你提供的 `options.layer` 与 Debug/Devtools/effectOp 相关层合并成 `appLayer`。
2. **组装 AppRuntime 配置并调用 internal `makeApp`**  
   - internal：`packages/logix-core/src/internal/runtime/AppRuntime.ts` → `makeApp(config)`
3. **注入 tick services（073）并规避 build-time capture 陷阱**  
   - 关键实现：AppRuntime 先 build “tick services baseline”，再在其基础上 build caller layers / module layers  
   - 目的：避免“module 初始化 fork 了常驻 fiber，但当时 env 里还没有 TickScheduler/RuntimeStore，导致永久缺失服务”的隐性 bug
4. **构建 Env 后再完成 RootContext（root provider 的单一真相源）**  
   - internal 在 build 完整 env 后，填充 `RootContextTag.context` 并 `Deferred.succeed(root.ready, env)`  
   - 这就是为什么 `Root.resolve` 默认不等待 ready（避免 setup 阶段 deadlock），而 `$.root.resolve` 是 run-only 且 `waitForReady=true`
5. **Env 就绪后安装 processes（长期任务）**  
   - AppRuntime 在 env ready 后通过 `ProcessRuntime.install(...)` 安装 processes；失败会走生命周期错误上报（可解释 cause）

### 2.3 Root.resolve / $.root.resolve 的“run-only 与可等待”差异

Root resolve 的底层实现：`packages/logix-core/src/internal/root.ts`

- `Root.resolve(tag)`：
  - 默认 `waitForReady=false`（避免 layer/setup 阶段死等）
  - 如果 root context 尚未 ready，会抛 `MissingRootProviderError`，并带 `reason: rootContextNotReady`
- `$.root.resolve(tag)`（Bound API 语法糖）：
  - 实现：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - **run-only guard**：禁止在 setup 阶段调用
  - 固定 `entrypoint: logic.$.root.resolve` 且 `waitForReady=true`

这两个入口共同保证：

- 业务写法“能等”的场景（run phase）可以写得自然；
- 维护者不会误把 Root.resolve 当成“setup 阶段拼 Env 的工具”，避免隐藏死锁。

---

## 3. 剧本集（高频 wiring 错误：症状 → 证据 → 修复）

### A. `$.use` 失败：`MissingModuleRuntimeError`（strict imports wiring 错）

**症状**：

- `Effect.exit($.use(Child))` 失败，pretty 里包含：
  - `MissingModuleRuntimeError`
  - `entrypoint: logic.$.use`
  - `mode: strict`
  - `tokenId: <ChildModuleId>`
  - `from: <ParentModuleId>`

**证据入口**：

- 错误构造点：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`（`resolveModuleRuntime`）
- “可运行复现”测试：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`

**修复**：

- 在 Parent 的实现里显式引入：`imports: [Child.impl]`
- 如果你其实想拿“root 单例”，不要用 `$.use`，改用 `$.root.resolve(Child.tag)`（并确保 Root layer/Root imports 提供该模块）

### B. Root.resolve 失败：`MissingRootProviderError`（root provider 缺失或未就绪）

**症状**：

- `MissingRootProviderError`（可能带 `reason: rootContextNotReady`）

**证据入口**：

- 错误构造点：`packages/logix-core/src/internal/root.ts`（`makeMissingRootProviderError`）
- 语法糖测试：`packages/logix-core/test/Bound/BoundApi.RootResolveSugar.test.ts`
- 排错清单：`docs/ssot/handbook/playbooks/troubleshooting.md`（2/3 节）

**修复**（按优先级）：

1. 真缺：在创建 Runtime Tree 时提供 Tag（`Runtime.make(root, { layer: Layer.succeed(Tag, impl) })`）
2. 别在 setup 阶段 resolve：在 Logic 的 run phase 用 `$.root.resolve`，不要在 layer/build/setup 中 `Root.resolve`（避免死锁/未就绪）
3. 不要试图用 `RuntimeProvider.layer` 去 mock root provider：Root.resolve 明确忽略 nearer-scope overrides

### C. Root.resolve “忽略 override”是刻意设计（不是 bug）

**症状**：

- 你写了 `Root.resolve(Tag).pipe(Effect.provideService(Tag, override))`，结果拿到的还是 root 值

**证据入口**：

- `packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.root-provider.test.ts`
- Root.resolve 语义注释：`packages/logix-core/src/internal/root.ts`

**结论**：

- Root.resolve = 固定 root provider（单一真相源）；override 只能影响 nearest-wins 的解析入口（如 `Effect.service` / `$.use` 在允许时）

### D. Tag collision：`TagCollisionError`（装配期 fail fast）

**症状**：

- AppRuntime 装配时直接 throw：`_tag: 'TagCollisionError'`，并列出冲突 owners

**证据入口**：

- internal：`packages/logix-core/src/internal/runtime/AppRuntime.ts`（`validateTags`）
- 测试：`packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`

**修复**：

- 一个 ServiceTag 只允许有一个“owner module”提供（或把它收敛到 Root layer）
- 避免让多个模块各自 provide 同一个 ServiceTag 并指望“merge 顺序解决一切”——这会让 Env 拓扑变成隐式、不稳定、难诊断

### E. Duplicate Module ID：装配期直接失败（比运行时随机更好）

**症状**：

- `[Logix] Duplicate Module ID/Tag detected: "<id>"`

**证据入口**：

- internal：`packages/logix-core/src/internal/runtime/AppRuntime.ts`（`seenIds` 检查）
- 测试：`packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`

**修复**：

- 保证一颗 Runtime Tree 下所有 module id 唯一（尤其是“copy-paste 新模块”时不要忘了改 id）

### F. assembly failure：为什么错误会以 lifecycle:error 形式出现？

**症状**：

- 你在逻辑里 `yield* $.use(Child)`，但 Child 缺失，最终不是“程序直接 throw”，而是出现生命周期错误事件

**证据入口**：

- `packages/logix-core/test/ErrorHandling/ErrorHandling.AssemblyFailure.test.ts`

**解释**：

- 这属于“运行时装配/启动阶段”的失败：runtime 会把 cause 上报到生命周期错误通道，保证可诊断与可观测
- 对平台/Devtools 来说，这类错误比“直接炸进程”更可解释：可以绑定到 moduleId/instanceId 并回放

### G. build-time capture 陷阱：为什么推荐 `Runtime.make(...,{ hostScheduler })`？

**症状**：

- 你试图用 `Layer.mergeAll(HostSchedulerOverride, ...)` 覆盖宿主调度，但 TickScheduler 等服务仍使用旧值

**证据入口**：

- Runtime.make options 注释：`packages/logix-core/src/Runtime.ts`（`hostScheduler`）
- AppRuntime tickServicesLayer 的 build 顺序注释：`packages/logix-core/src/internal/runtime/AppRuntime.ts`

**修复**：

- 如果你需要覆盖 HostScheduler，优先用 `Runtime.make(root, { hostScheduler })` 把 override 注入 tick services build pipeline

---

## 4. 代码锚点（Code Anchors）

### Public API

- `packages/logix-core/src/Module.ts`：ModuleDef/Module/ModuleImpl 的 public 形态与装配参数（imports/processes/layers）
- `packages/logix-core/src/Runtime.ts`：`Runtime.make`（以及 `runProgram/openProgram`）
- `packages/logix-core/src/Root.ts`：`Root.resolve`（root provider 入口）

### Internal（维护者必读）

- `packages/logix-core/src/internal/runtime/AppRuntime.ts`：`makeApp`、tick services build、RootContext 完成、process install、Tag collision
- `packages/logix-core/src/internal/root.ts`：Root.resolve 的真正语义（waitForReady/错误字段）
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`：`$.use` 的 strict imports 解析与 `$.root.resolve` 语法糖

### Tests（建议直接当教程读）

- `packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
- `packages/logix-core/test/Bound/BoundApi.RootResolveSugar.test.ts`
- `packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.root-provider.test.ts`
- `packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`
- `packages/logix-core/test/ErrorHandling/ErrorHandling.AssemblyFailure.test.ts`

### 相关文档入口（权威口径）

- runtime container：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
- imports/root/link 三分法：`docs/ssot/handbook/tutorials/07-module-graph-and-collaboration.md`
- 排错清单：`docs/ssot/handbook/playbooks/troubleshooting.md`

---

## 5. 验证方式（Evidence）

最推荐的验证方式是“跑与读同一份测试”（测试即教程）：

- strict imports：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
- root provider：`packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.root-provider.test.ts`
- tag collision：`packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`

---

## 6. 常见坑（Anti-patterns）

1. 把业务流程塞进 Root 装配层（Root 只做 imports/processes/layer）。
2. 在 setup/layer build 阶段调用 `Root.resolve`（很容易 `rootContextNotReady` 或引入隐性死锁）。
3. 用 `RuntimeProvider.layer` 试图 mock root 单例（Root.resolve 明确忽略 near-scope overrides）。
4. 依赖“merge 顺序”解决服务冲突（应该 fail fast，并显式裁决 owner）。
5. 用 `$.use` 去拿全局单例（这是 wiring 错误；应该用 root.resolve 或显式 link）。

