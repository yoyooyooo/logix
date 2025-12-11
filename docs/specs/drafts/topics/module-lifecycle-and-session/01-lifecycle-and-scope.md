---
title: Module Lifecycle & Scope
status: draft
version: 1.0.0
layer: Topic
value: core
priority: next
related:
  - ../../L9/runtime-logix-core-gaps-and-production-readiness.md
  - ../../L9/form-session-draft-pattern-convergence.md
  - ../../../runtime-logix/core/02-module-and-logic-api.md
  - ../../../runtime-logix/core/07-react-integration.md
  - ../draft-pattern/README.md
  - ../draft-pattern/01-contract.md
  - ../draft-pattern/20-boundary-analysis.md
  - ./02-unified-resource-cache.md
  - ./03-session-keepalive-pattern.md
---

# Module Lifecycle & Scope（模块生命周期与 Scope）

> 目的：围绕 `$.lifecycle`（模块级）与 Platform 级生命周期钩子，梳理当前 Runtime Logix 的实现现状与缺口，并为后续在 `runtime-logix` SSoT 中补齐规范、在 React 平台中接线提供一份系统化 TODO 清单。

## 1. 现状梳理（State of the World）

### 1.1 模块级生命周期：onInit / onDestroy / onError

- **实现**：
  - `BoundApi.lifecycle` 中的 `onInit/onDestroy/onError` 通过 `LifecycleManager` 实现：
    - `onInit` → `LifecycleManager.registerInit`：返回一个 Effect，调用方 `yield* $.lifecycle.onInit(eff)` 时，同步执行 `eff`，错误通过 `notifyError` + `DebugSink` 上报。
    - `onDestroy` → `registerDestroy`：登记清理 Effect，在 ModuleRuntime Scope 关闭时，由 `runDestroy` 串行执行。
    - `onError` → `registerOnError`：登记错误处理器，在 `notifyError` 时被调用；仅用于上报，不阻止 Scope 关闭。
  - ModuleRuntime 在 `make` 内部通过 `Lifecycle.makeLifecycleManager` 创建并注入 `LifecycleContext`，在 finalizer 中先跑 `lifecycle.runDestroy`，再记录 `module:destroy`，同时从 runtimeRegistry 中卸载实例。
- **语义**：
  - `onInit` 是 **Logic 内的阻塞初始化钩子**：
    - 成功：继续执行后续逻辑；
    - 失败：错误被报告到 `onError` + DebugSink，当前 Logic Fiber 失败，不影响其他已 fork 的 watcher。
  - `onDestroy` 绑定 ModuleRuntime 的 Scope：不区分“局部 ModuleImpl”还是“App 级 Module”，只要 Scope 真关闭，对应的 onDestroy 都会跑。
  - `onError` 表示“模块内部已经发生了未捕获的 Defect”，用于最后一跳上报。
- **与异步 ModuleImpl 的关系**：
  - Async ModuleImpl（Suspense 模式）只是通过 **ModuleCache** 改变了 **ModuleRuntime 构建的时机与复用方式**（按 `key` lazy 构建 + 引用计数），并不改变 onInit/onDestroy/onError 的语义；
  - 推荐姿势：
    - “必须完成才能对外可用”的初始化（例如拉配置） → 写成 `yield* $.lifecycle.onInit(Effect.gen(...)) + ready 标记`；
    - 真正的挂起/恢复、软重置 → 交给 Platform 级 lifecycle。

### 1.1.1 与 Draft Pattern / Form Session 的嵌套关系

- Draft Pattern Topic（`topics/draft-pattern/*`）中定义的 Draft/DraftRuntime，本质上是 **Interaction Transaction（交互事务）**，其 Scope 由 Draft Runtime 自身管理；
- 在 Module 视角下，可以将 Draft 看作 Data Scope 内部的 **事务子 Scope**：
  - ModuleRuntime 的根 Scope 负责承载长期存在的 Domain/Module State；
  - Draft Scope 只在交互事务存续期间存在，负责隔离用户输入与领域状态（参见 `draft-pattern/20-boundary-analysis.md` 中的 Interaction vs Domain 区分）。
- Form Session 草案（`L9/form-session-draft-pattern-convergence.md`）进一步将 Draft 领域化为 `FormSession` / `WizardSession`：
  - 对外暴露的是「表单会话」语义（填表、向导等），内部可以复用 Draft 的 Atomicity/Isolation 行为；
  - 在 Module Lifecycle 语境下，一个 Page/Module Session（由 ModuleRuntime + **ModuleCache** 承载）可以在其 Data Scope 内托管若干短生命周期的 Form/Draft Session。
- 约定：
  - Module 级 `$.lifecycle.onDestroy` 负责关掉与该 ModuleRuntime 绑定的根 Scope，间接确保所有 Draft/Form Session 子 Scope 被关闭；
  - Draft/Form Session 不直接操纵 ModuleRuntime 的根 Scope，只在自己的事务边界内管理交互生命周期（start/commit/destroy）。

### 1.2 平台级生命周期：onSuspend / onResume / onReset（行为维度）

- **BoundApi 实现现状**：
  - `$.lifecycle.onSuspend/onResume/onReset` 并不走 `LifecycleManager`，而是 **代理到 Platform Service**：
    - 内部实现形态：`withPlatform(platform => platform.lifecycle.onSuspend/…(eff))`；
    - 依赖 `Logic.Platform` Tag，当前仅在 core 层定义协议。
- **React 集成现状**（仅行为维度）：
  - `@logix/react` 的 `RuntimeProvider` 目前只负责：
    - 提供 `ManagedRuntime` 与 Layer 上下文；
    - 绑定/销毁应用级 Layer Scope；
    - 接入 **ModuleCache**（局部 ModuleImpl 的 Scope 与 Suspense 集成，用于内存层面的存在/GC 管理）。
  - 尚未提供 React 版 `Platform` 实现，也没有将任何来自 React 的生命周期事件（如路由切换、可见性变化）映射到 `Logic.Platform.lifecycle`。
- **风险 & 语义空白**：
  - 在 React 应用里，`$.lifecycle.onSuspend/onResume/onReset` **目前不会被触发**，除非调用方显式在 Env 中提供 Platform Tag；
  - 业务容易误将 “React Suspense fallback” 视为 “模块被挂起”，而实际 Suspense 只是“尚未构建/初始化完成”，语义上更接近 onInit 阶段，而非平台级挂起。

### 1.3 React Suspense / StrictMode / ModuleCache（存在维度）

- **ModuleCache 已覆盖的点**：
  - 每个 ManagedRuntime 持有一个 **ModuleCache**（WeakMap），按 key 缓存该 Runtime 内的 ModuleRuntime 实例；
  - `read`（Suspense 模式）：
    - 按 `key` lazy 构建 ModuleRuntime，构建失败走 error 状态并关闭 Scope；
    - pending status 时抛出 Promise，驱动 React Suspense；
    - refCount + 延迟 GC（`gcTime`）保障 StrictMode + render abort 场景下 Scope 不泄漏，也避免频繁重建。
  - `readSync`（同步模式）：
    - 要求命中的 entry 永远不是 pending，否则抛出详细错误（混用了 sync 和 suspend 模式访问同一 `key`）。
  - React 层已有集成测试验证 StrictMode + Suspense 下：
    - 同 `key` → 多组件共享同一 ModuleRuntime；
    - 不同 `key` → 实例隔离；
    - `suspend:true` 缺 `key` → dev 下直接抛出指导性错误。
- **与 `$.lifecycle` / Platform lifecycle 的交汇点**：
  - ModuleRuntime Scope 关闭时，会统一触发 `lifecycle.runDestroy`，这对“局部 ModuleImpl + React Suspense + StrictMode”已经成立；
  - ModuleCache 负责的是 Runtime Scope 的“存在与回收”（内存维度），即 **Exists?**；
  - Platform 级的 `onSuspend/onResume/onReset` 负责的是 Runtime Scope 在“存在期间如何运行”（行为维度），即 **Active?**。  
    典型流程可描述为：
    - UI 卸载/隐藏 → （未来）ReactPlatform.lifecycle 触发 `onSuspend`，暂停高频任务；  
    - 同时 refCount 归零 → ModuleCache 开始按 `gcTime` 计时；  
    - 若在 `gcTime` 内重新挂载 → refCount > 0 → 取消 GC，并触发 `onResume` 恢复行为；  
    - 若 `gcTime` 到期仍无人引用 → ModuleCache 关闭 Scope → 触发 `onDestroy`，彻底销毁该 Session。

### 1.3 模块生命周期 × Session：统一阶段视图

在前两小节里，模块生命周期（`$.lifecycle`）、Platform lifecycle 与 ModuleCache/Session 是分开描述的，本节给出一个统一的阶段视图，方便在实现与文档中对齐心智模型。

- **维度拆分（四层视角）**：
  - **数据 Scope（ModuleRuntime Scope）**：由 `ModuleRuntime` 的内部 Scope 承载，`$.lifecycle.onInit/onDestroy/onError` 与之绑定；
  - **资源 Scope（ModuleCache Entry）**：由统一的 `ModuleCache` 管理，负责“某个 Runtime 实例在内存中存活多久”；
  - **会话语义（Session Pattern）**：由调用方在 `useModule(Impl, { key, gcTime })` 中选择 `key + gcTime` 决定，是统一暴露给 React/业务开发者的“会话级状态保持”接口；
  - **行为状态（Platform lifecycle）**：由 `Logic.Platform.lifecycle.onSuspend/onResume/onReset` 驱动，决定“何时暂停/恢复高频行为或做软重置”，不直接关闭 Scope。

- **阶段划分（抽象时间轴）**：
  1. **构建阶段（Construct）**
     - 触发：首次通过 ModuleImpl.layer 或 ModuleCache 创建某个 ModuleRuntime；
     - 数据 Scope：打开根 Scope，注册所有 Logic，并串行执行已登记的 `onInit`；
     - 资源 Scope：ModuleCache 中创建 Entry，`status = pending/success`；
     - Session：若调用方传入了显式 `key`，在该 Runtime 内认领一个“会话身份”；否则视为组件私有的短 Session；
     - Platform：尚未参与，生命周期由 Runtime/React 自身驱动。
  2. **活跃阶段（Active）**
     - 数据 Scope：Scope 打开，Logic watcher 与进程运行中，可以持续读写 State / dispatch Action；
     - 资源 Scope：Entry `refCount > 0`，至少有一个 React 组件通过 `useModule`/`useLocalModule` 持有该实例；
     - Session：在业务心智中，可以描述为“某个页面/Tab/Widget 的会话正在进行”，例如「订单编辑会话打开中」；
     - Platform：可以选择性注册 `onSuspend/onResume`，响应页面可见性/路由切换等行为事件。
  3. **空闲阶段（Idle, KeepAlive）**
     - 数据 Scope：仍然打开，State/Store 保持在内存中，但暂时没有 UI 订阅者；
     - 资源 Scope：`refCount` 回到 0，ModuleCache 启动基于 `gcTime` 的 Idle 计时（参见 `02-unified-resource-cache.md`）；在计时窗口内，如果有新组件重新 `retain`，则视为“会话恢复”，取消 GC；
     - Session：从业务视角看，会话处于“后台/暂存”状态，例如 Tab 被关闭但允许稍后恢复；
     - Platform：可通过 `onSuspend` 暂停高频行为（轮询等），但不销毁会话本身。
  4. **结束阶段（Terminate）**
     - 数据 Scope：Idle 计时结束且 `refCount` 仍为 0 时，ModuleCache 触发 Scope 关闭，串行执行所有 `onDestroy`，随后删除 Entry；
     - 资源 Scope：该 Runtime 实例彻底从缓存中移除，所有 watcher/进程停止；
     - Session：会话结束，无法再从该实例恢复状态，只能重新创建新会话；
     - Platform：若有需要，可通过 `onReset` 或显式 `evict(key)` 在计时前主动中止会话。

- **从内部实现到对外 API 的映射**：
  - 内部实现层（`logix-core`）只暴露 ModuleRuntime Scope 与 ModuleCache 两层能力，Session/KeepAlive 只是“Key + gcTime 策略”的组合；
  - React/应用层通过统一的 `useModule(Impl, { key, gcTime, suspend })` 暴露「组件级 / 区域级 / 会话级」三种典型模式（详见 `03-session-keepalive-pattern.md`）；
  - Platform lifecycle 提供的是“行为维度的状态机”，例如：
    - 当页面从前台 → 后台时，对活跃或 Idle 的 Session 调用 `onSuspend` 暂停高频行为；
    - 当页面恢复时，如果 Session 仍在 Idle 窗口内，直接 `onResume`；否则由业务显式重建新会话。

> 心智模型归纳：**Session = ModuleRuntime 实例 + 稳定的 `key` + 一段 `gcTime` + 一套 Platform 行为策略**。  
> `$.lifecycle` 保证 Scope 正确开启/关闭，ModuleCache 决定“存在多久”，Session Pattern 决定“如何被业务引用”，Platform lifecycle 决定“在存在期间如何表现”。

## 2. 待办清单（TODOs）

本节按“模块级生命周期（已接通）”与“平台级生命周期（未接通）”拆分 TODO。

### 2.1 模块级生命周期：规范与测试补全

1. **在 SSoT 中明确 onInit/onDestroy/onError 与异步 ModuleImpl 的关系**
   - 更新 `runtime-logix/core/02-module-and-logic-api.md`：
     - 强调 `$.lifecycle.onInit` 是在 Logic 内部注册并立即执行的阻塞初始化逻辑，属于“模块内部生命周期”，而不是 React/平台生命周期；
     - 补充 Async ModuleImpl 示例：
       - 在 Logic 中先 `yield* $.lifecycle.onInit(Effect.gen(...需要的 IO...))`，再更新 `ready` 字段；
       - Suspense fallback 只负责“UI 层的 loading”，不改变 onInit/onDestroy 的语义。
   - 在 `runtime-logix/impl/module-lifecycle-and-scope.md` 中补一小节，说明：
     - **ModuleCache** 只影响 ModuleRuntime 构建/复用，不改变 LifecycleManager 的注册/触发时机；
     - 在局部 ModuleImpl + Suspense 下，onDestroy 的触发时机仍与 Scope 关闭对齐（由缓存 GC 驱动）。

2. **补一组“Async ModuleImpl + onInit/onDestroy”系统测试**
   - 在 `@logix/core` 的测试中新增：
     - 通过 ModuleImpl + Async Logic（包含 `Effect.sleep` + `$.lifecycle.onInit`）构建 ModuleRuntime；
     - 断言：
       - onInit 中注册的 Effect 在 ModuleRuntime 首次构建时按序执行（可通过 DebugSink 或 Ref 捕获）；
       - ModuleRuntime Scope 关闭时，对应 onDestroy 被调用一次，且不会因为 StrictMode/多次 render 被重复调用。
   - 覆盖场景：
     - 单实例；
     - 多实例（不同 ModuleRuntime）并行，互不干扰。

3. **明确 onError 的使用边界**
   - 文档层面补充：
     - onError 只用于“最后一跳上报”，不能指望它做错误恢复（恢复应该在 Logic 内部跑 try/catch 或 `Effect.catchAll`）；
     - Link / useRemote / processes 等长期 watcher 的错误，默认策略是：
       - 抛到 ModuleRuntime Scope → 触发 onError + DebugSink → Scope 关闭（模块崩溃）；
       - 需要重试/自愈时，应在 Link/Flow 内部包裹 retry/supervisor。
   - 对应 TODO 已在 `runtime-logix-core-gaps-and-production-readiness.md` 中标记，这里需在实现与文档上对齐。

### 2.2 平台级生命周期：React 平台接线与策略

> 目标：让 `$.lifecycle.onSuspend/onResume/onReset` 在 React 应用中有清晰语义和最小可用实现，同时避免与 Suspense 的概念混淆。

4. **在 SSoT 中明确 Platform 级生命周期与 Suspense 的边界**
   - 在 `runtime-logix/core/02-module-and-logic-api.md` 中扩展 “Future Lifecycle Hooks” 小节：
     - 明写：
       - onSuspend/onResume/onReset 属于 **平台级** 生命周期（由 `Logic.Platform` 驱动），与 ModuleCache/Suspense 的加载状态无关；
       - Suspense 只反映“模块尚未构建/初始化完成”或“某次运行的中间挂起”，不能被视为业务上的“页面挂起”；
       - onSuspend/onResume 应该映射到“页面/组件从前台 → 后台 / 不可见 → 再次可见”等更长期的可见性变化。

5. **设计 ReactPlatform.lifecycle 的最小实现草案**
   - 在本草稿基础上起草一个 ReactPlatform lifecycle 设计（可后续提升为单独 Topic）：
     - 事件来源：
       - 路由切换（例如某个 Route 卸载/挂起）；
       - `document.visibilitychange`（页面级前后台切换）；
       - 将来可能接入 `<Offscreen>` / KeepAlive 的 show/hide。
     - 映射策略：
       - 初版可以只实现应用级 onSuspend/onResume：当整个 React 应用进入后台时，对所有注册了 onSuspend 的模块广播一次 suspend；
       - 进一步再支持“页面级/模块级可见性区域”的标记（例如通过 RuntimeProvider 层级或特定 Hook 标记某个模块属于哪个“可见域”）。
     - 输出形态：
     - 在 `@logix/core` 中补充 Platform 接口规范文档（已有基础草案，可完善）；
     - 在 `@logix/react` 中新增 `ReactPlatform` 实现，并通过 RuntimeProvider 的 Layer 注入到 Runtime Env。
       - （2025-12 更新）当前已提供 `ReactPlatformLayer`（`@logix/react/src/platform/ReactPlatformLayer.ts`），实现了 `Logic.Platform` 接口并收集 `onSuspend/onResume/onReset` 注册的 Effect；默认不绑定具体 DOM 事件，由宿主应用在构造 Runtime 时将该 Layer 合并进 `Logix.Runtime.make(..., { layer })`，并按需在外层接线 Page Visibility / 路由等事件。

6. **实现 ReactPlatform.lifecycle 的 MVP + 集成测试**
   - 在 `@logix/react` 中实现一个最小版本：
     - RuntimeProvider 启动时，为 `document.visibilitychange` 注册监听器；
     - 当页面从 visible → hidden 时，调用 `Logic.Platform.lifecycle.onSuspend`；
     - 当 hidden → visible 时，调用 `onResume`。
   - 在 `@logix/core` + `@logix/react` 的测试中补充：
     - 构造一个注册了 `$.lifecycle.onSuspend/onResume` 的 Logic；
     - 在测试环境中手动触发 Platform lifecycle（通过直接调用 Platform service 或模拟事件），断言：
       - onSuspend/onResume 的 Effect 被调用；
       - 多模块场景下，仅受影响的 Runtime 被触发或控制范围合理（视设计决定是否做模块级选择）。
   - 后续再讨论 onReset 的触发入口（例如 Logout / 手动 Reset 按钮）。

### 2.3 React StrictMode / ErrorBoundary 与 lifecycle 的交互

7. **设计 StrictMode 场景下生命周期幂等策略**
   - 问题：StrictMode 会触发额外的 mount/unmount/重试，
     我们需要明确哪些生命周期可以“多跑一次只是多 log”，哪些必须严格成对：
     - onInit：多跑一次通常是可以接受的（初始化逻辑应幂等）；
     - onDestroy：必须与真实 Scope 关闭绑定，目前 ModuleCache 的 GC 机制已经保证只在真正销毁时触发；
     - Platform 级 onSuspend/onResume：需要确保不会因为 StrictMode 的内部重试而错误触发。
   - TODO：
     - 在 `runtime-logix/impl/v3-scope-lock.md` 或相关文档中，把“StrictMode 幂等约束”写清楚；
     - 在现有测试基础上再补一两条断言，确认 onDestroy/Platform lifecycle 不会因为 StrictMode 双调用而重复触发。

8. **定义 Logic error → React ErrorBoundary 的映射策略**
   - 当前：
     - Logic error → lifecycle.onError + DebugSink + Scope 关闭；
     - React 侧并不知道某个模块已经“彻底崩溃”，只能继续渲染旧视图或留在 fallback。
   - 候选策略：
     - 在 AppRuntime 层汇总一个只读 `errors$`，由 React RuntimeProvider 订阅，在遇到“不可恢复错误”时触发内部 state，进而由 ErrorBoundary 捕捉；
     - 或提供一个轻量 API：`<RuntimeProvider onFatalError={...}>`，让调用方自定义如何把 runtime error 映射到 UI。
   - TODO：
     - 在 `runtime-logix-core-gaps-and-production-readiness.md` 所描述的「统一观测通道」设计中，补上 ErrorBoundary 映射方案；
     - 在 `@logix/react` 加一个小型 demo + 集成测试：
       - 构造一个会在 Logic 中 die 的场景；
       - 验证 lifecycle.onError + App 级错误通道 + React ErrorBoundary 可以组成一条完整的错误链路。

## 3. 与其他草案 / Topic 的关系与后续演进

- 与 `runtime-logix-core-gaps-and-production-readiness.md`：
  - 本文细化了其中关于「生命周期 / React 集成 / StrictMode/Suspense」的缺口描述；
  - 后续在 core SSoT 与实现中补齐的规范，应同步回写到该 L9 草案，标记对应条目为已完成或降级优先级。

- 与 `02-unified-resource-cache.md`：
  - 02 侧重 React 适配层的 **ModuleCache** (Unified) 与 StrictMode/Suspense 行为，是“Scope & 生命周期”在 UI 集成侧的具体落地；
  - 01 更偏抽象契约（`$.lifecycle` + Platform lifecycle 的职责边界），两者合起来构成「生命周期 + Scope 管理 + React 集成」的完整 Topic。

- 与 `03-session-keepalive-pattern.md` 及 `L9/page-level-module-state-retention.md`：
  - 03 将页面级状态保持泛化为 Session KeepAlive 协议，并基于统一的 **ModuleCache** (`gcTime`) 实现；
  - 当本篇中的 Platform 级生命周期与 React 集成 TODO 完成后，Session/Page 级模式可以直接引用对应规范作为前提，不再需要重复定义生命周期信号。

后续演进建议：

- 完成第 2 节中的关键 TODO（特别是 4–6 + StrictMode 幂等策略）后：
  - 在 `docs/specs/runtime-logix/core` / `impl` 中形成正式规范条目：
    - 在 `core/02-module-and-logic-api.md` 中增加「Module Lifecycle & Session」小节，明确本文 1.3 所述四层视角与四个阶段的契约；
    - 在 `core/07-react-integration.md` 中将统一 `ModuleCache + useModule(Impl, { key, gcTime })` 的 Session 用法正式化，并链接到相关测试/示例；
    - 在 `impl/*` 下记录 ModuleCache、Platform lifecycle 的实现细节与演进约束。
  - 在 `apps/docs` 中抽取面向最终产品用户的文档：
    - 在「State Retention / 页面状态保持」章节中，以 Session Pattern 为主线，只保留简单可记的规则（例如“一种 API，三种生命周期：组件级/区域级/会话级”），隐藏内部 Scope/Cache 细节；
    - 在「Lifecycle & Watcher 模式」章节中，用 Platform lifecycle 的行为视角解释“什么时候暂停/恢复任务”，而非解释内部 Effect 实现。
  - 将本 Topic 由 “纯 TODO 列表” 逐步收敛为“生命周期与 Scope/Session 的实现备忘与补充说明”，并在必要时拆分出更细的子 Topic（例如专门的 Platform lifecycle 设计文档），同时在收敛完成后下调本 Topic 的 `priority`。
