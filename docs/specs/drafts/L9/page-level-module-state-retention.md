---
title: Page Level Module State Retention
status: draft
version: 1.0.0
authors:
  - User
  - Agent
priority: 1300
---

# Page Level Module State Retention (页面级模块状态保持)

> **背景**：用户反馈在后台管理系统（Admin）等场景中，存在大量（甚至数百个）“页面级”模块。这些模块在路由切换时（视觉上不可见）需要保留状态（如表单填写内容、列表滚动位置、筛选条件等），但如果全部提升为 `Logix.app` 级别的“全局 Module”，会导致全局状态爆炸、内存占用过高且难以管理。

## 1. 问题定义

当前 Logix 运行时的模块生命周期主要有两种极端：

1.  **Global Module (App Level)**:
    *   生命周期：随 App 启动而启动，直到 App 销毁。
    *   优点：状态持久保持，跨路由共享。
    *   缺点：对于“非单例”的页面（如 100 个不同的详情页），全部注册为全局模块不合理；资源无法及时释放；命名空间污染。

2.  **Transient Module (Component Level)**:
    *   生命周期：随 React 组件 Mount 创建，Unmount 销毁。
    *   优点：轻量，自动回收。
    *   缺点：路由切换（A -> B -> A）会导致 A 的状态完全丢失，用户体验差（需重新加载/重新填写）。

**目标**：寻找一种“优雅”的中间态做法，既能满足“页面切走后状态保留”的期望，又不需要将所有页面模块都提升为全局单例。

## 2. 核心诉求

1.  **按需保持 (Retainable/Keep-Alive)**：模块实例在 UI 卸载后不立即销毁，而是进入“休眠/缓存”状态。
2.  **自动恢复 (Resume)**：当 UI 再次挂载（路由切回）时，能通过某种 Key（如 Route Path）找回之前的实例并重新连接。
3.  **资源管理 (Eviction)**：不能无限制缓存，需要有 LRU 或手动销毁机制，避免内存泄漏。
4.  **API 优雅性**：尽量不增加复杂的 boilerplate，最好能结合路由或简单的配置实现。

## 3. 当前实现现状（Fractal Runtime 已落地）

围绕“分形 Module / 分形 Runtime”，当前规范与实现已经基本收敛：

1.  **核心概念与入口**：
    *   `LogixRuntime` / Root ModuleImpl / `processes` 的职责边界，已在 `runtime-logix/core/02-module-and-logic-api.md` 与 `core/05-runtime-implementation.md` 中固化；
    *   `@logix/core` 已提供 `LogixRuntime.make(rootImpl, options)` 实现，并在示例与用户文档中作为唯一推荐入口使用。
2.  **React 侧分形组合**：
    *   `RuntimeProvider` / `useModule` / `useLocalModule` 的行为已在 `runtime-logix/core/07-react-integration.md` 与 `runtime-logix/react/README.md` 中定义，并在 `@logix/react` 中实现；
    *   支持以 Root ModuleImpl + `LogixRuntime.make` 构造 App / Page / Feature 级 Runtime，并通过嵌套 `RuntimeProvider` 复用 Runtime 或叠加局部 Layer（形成分形 Runtime Tree）。
3.  **示例与 PoC**：
    *   `examples/logix-react` 与 apps/docs 中已经使用 `LogixRuntime.make` + `RuntimeProvider` 演示应用级 Runtime 与局部模块组合。

因此，本草稿不再详细描述 Fractal Runtime / LogixRuntime / RuntimeProvider 的 API 设计，**仅聚焦尚未完全收敛的“页面级模块状态保持”问题**：包括状态保活缓存策略、Eviction 机制以及挂起/恢复语义等，并给出一套可落地的协议级方案。

## 4. Page Lifecycle Protocol（方案草案）

本节给出“页面级模块状态保持”的推荐协议，围绕三个核心问题展开：

1.  Effect 清理：如何在“页面休眠”时暂停不必要的进程，又保持状态（State）不丢失；
2.  内存压力：如何在大量页面存在时，通过 LRU 等机制控制 Runtime/Module 的数量；
3.  依赖边界：如何在 Fractal Runtime 模型下，显式管理 Page 与 App 之间的依赖关系。

### 4.1 Scope 分层与 Effect 清理（Data Scope / View Scope）

**目标**：页面切走时保留状态（State），但暂停或销毁 UI 相关的高频任务；页面切回时能恢复渲染并在必要时重新拉取数据。

#### 4.1.1 两层 Scope 的概念区分

在语义上引入两类 Scope（实现上可以仍复用 Effect.Scope，但在约定上区分职责）：

1.  **Data Scope（数据 Scope）**：
    *   持有模块的核心数据结构：`SubscriptionRef<State>`、`PubSub<Action>`、Tag 注册等；
    *   由 `ModuleRuntime` / Root ModuleImpl 所在的 Scope 承载，生命周期受 Page Cache / RuntimeCache 控制；
    *   页面被“移出视图”时，Data Scope **不会立即关闭**，以保留状态。
2.  **View Scope（视图 Scope）**：
    *   持有与 UI 直接相关的资源：数据订阅、轮询、WebSocket、DOM 监听、动画等；
    *   生命周期与 React 组件树强绑定，通常由 `RuntimeProvider` / `useLocalModule` / Logic 中的 `Effect.forkScoped` 创建；
    *   页面卸载（或进入 Hidden/Offscreen）时，View Scope 可以被关闭或暂停。

约定：**页面级“休眠”仅针对 View Scope**，Data Scope 的关闭必须由上层的 Cache/Runtime 管理器显式触发。

#### 4.1.2 Lifecycle 信号与 Logic.Platform 集成

在 `Logic.Platform` 中已经预留：

*   `onSuspend(eff)`：宿主环境进入“后台/不可见”时触发；
*   `onResume(eff)`：从“后台”恢复到前台时触发；
*   （可选）`onReset(eff)`：逻辑级软重置。

在 Page Keep-Alive 场景中，推荐约定：

*   React 适配层（`@logix/react`）负责将路由 / Offscreen / KeepAlive 信号翻译为 `onSuspend` / `onResume` 调用；
*   业务 Logic 中所有“依赖 UI 可见性”的任务（例如高频轮询、动画、视图驱动型 watcher）都通过 `Logic.Platform.lifecycle` 进行注册。

伪代码示例（意图级写法）：

```ts
// 仅在页面可见时运行的轮询任务
const PollingLogic = MyModule.logic(($) =>
  Effect.gen(function* () {
    const polling = Stream.tick("5 seconds").pipe(
      Stream.tap(() => $.state.mutate(s => { s.isRefreshing = true })),
      Stream.tap(() => /* 拉取数据 */ Effect.void),
      Stream.tap(() => $.state.mutate(s => { s.isRefreshing = false })),
      Stream.runDrain,
    )

    // 注册为“可挂起”的任务：页面 suspend 时中断，resume 时重新启动
    yield* Logic.Platform.lifecycle.onSuspend(
      Effect.interruptFiber("polling-fiber"),
    )
    yield* Logic.Platform.lifecycle.onResume(
      Effect.forkScoped(polling),
    )
  }),
)
```

> 实现层注意：`onSuspend` / `onResume` 的最终形式以 `runtime-logix/core/02-module-and-logic-api.md` 中的签名为准，以上仅表达“挂起/恢复由 Platform 驱动”的意图。

#### 4.1.3 ModuleLifecycle：实例级策略配置

为避免业务 Logic 手动管理所有生命周期差异，建议在 ModuleImpl 层引入轻量的 `ModuleLifecycle` 配置，用于声明实例的整体策略：

*   `mode: "transient" | "keepAlive" | "alwaysOn"`：
    *   `"transient"`：随 React 组件 Mount/Unmount 创建/销毁（适合表单、对话框）；
    *   `"keepAlive"`：由 Page Cache 管理 Data Scope，View Scope 按页面可见性挂起/恢复；
    *   `"alwaysOn"`：类似 App 级全局模块，Data Scope + View Scope 都长期存在，仅在应用退出或显式清理时释放。
*   `onEvict?: "softReset" | "hardClose"`：
    *   `"softReset"`：在被缓存驱逐前，对 State 做一次业务级重置（例如回到初始状态）；
    *   `"hardClose"`：直接关闭整个 Scope，完全释放资源。

这些配置不必一开始就完整实现，可以先在规范与类型层预留字段，逐步在 `ModuleImpl.make` / Page Cache 中接入。

### 4.2 RuntimeCache / PageCache：页面级 LRU 管理器

**目标**：在大量页面（几十或上百）存在时，控制同时常驻内存的 Page Runtime / Module 实例数量，避免 JS 堆无限膨胀。

#### 4.2.1 抽象接口

定义一个“页面运行时缓存”服务，作为 App 级 Runtime 中的 Tag：

```ts
export interface PageRuntimeCache<Key> {
  readonly acquire: (
    key: Key,
    factory: () => Effect.Effect<ManagedRuntime.ManagedRuntime<any, never>>,
  ) => Effect.Effect<ManagedRuntime.ManagedRuntime<any, never>>

  readonly release: (
    key: Key,
  ) => Effect.Effect<void>
}
```

*   `key` 通常是 `{ route: string; params: Record<string, string> }` 或等价的 Page Identity；
*   `acquire`：在缓存中查找对应的 Runtime，若不存在则通过 `factory` 创建一个新的 `LogixRuntime.make(PageImpl, options)`；
*   `release`：当路由栈变更（例如 Tab 关闭）时，显式告知缓存“这个 key 目前不在可见栈中”，允许 Cache 按策略选择是否保留或驱逐。

`PageRuntimeCache` 的具体实现可以挂在 Root ModuleImpl 的 `imports` 或 App 级 Layer 中，由平台层负责提供。

#### 4.2.2 LRU 策略与冷热分层

Cache 的最小行为：

*   维护 `Map<Key, Entry>`，Entry 中至少包含：
    *   `runtime: ManagedRuntime`；
    *   `lastActiveAt: number`；
    *   可选的权重/大小信息（例如 State 大小估计）。
*   维持一个整型上限 `maxEntries`（例如 20），当 `acquire` 导致缓存条目数超过上限时：
    *   找出 LRU 的 Entry；
    *   对其调用 `runtime.dispose()` 或在内部 `Scope.close`，彻底释放。

进阶方案（可在后续草案或 impl 文档中展开）：

*   **冷热分层**：
    *   Hot：近期频繁访问的页面，完全常驻内存；
    *   Warm：长期未访问但仍在 LRU 阈值内的页面，保留 State，关闭大部分后台进程；
    *   Cold：超出阈值的页面，将 State 序列化到 `sessionStorage` / IndexedDB 后销毁 Runtime。
*   页面再次激活时：
    *   若命中 Hot/Warm，直接返回已有 Runtime；
    *   若处于 Cold，则重新创建 Runtime，并从持久化存储中 Hydrate State。

对于当前 v3，建议先实现纯内存版 LRU（Hot/Warm 合并），将 Cold/持久化视为 v3.x / v4 的性能增强方向。

#### 4.2.3 React 集成形态

在 React 层，Page Keep-Alive 的典型使用方式可以是：

```tsx
function PageShell({ pageKey, impl }: { pageKey: PageKey; impl: ModuleImpl<any, any, any> }) {
  const cache = useService(PageRuntimeCacheTag)

  const runtime = useMemo(
    () =>
      cache.acquire(pageKey, () =>
        Effect.sync(() => LogixRuntime.make(impl)),
      ),
    [cache, pageKey, impl],
  )

  // 通过 RuntimeProvider 将页面级 Runtime 注入子树
  return (
    <RuntimeProvider runtime={runtime}>
      <PageComponent />
    </RuntimeProvider>
  )
}
```

路由层负责维护 `pageKey` 与“是否仍在路由栈中”的关系，并在 Tab 关闭/导航栈修剪时调用 `cache.release(pageKey)`。

### 4.3 显式依赖与 Context Bridge（禁止隐式冒泡）

**目标**：在 Fractal Runtime 模型下，Page Runtime 既可以复用 App 级服务（例如 UserStore、ThemeService），又不会引入“向上偷拿 Tag”的隐式耦合。

#### 4.3.1 设计原则

1.  Runtime 是封闭容器：在类型与实现层面，Runtime 内的依赖只能来自自身 Layer/Context；
2.  Page 需要复用 App 的服务时，必须通过显式 Bridge 注入；
3.  React Context 嵌套仅用于 UI 侧确定“当前 Runtime”，不参与 Env 冒泡。

#### 4.3.2 Context Bridge 形态

推荐在 App 级 Layer 中提供一个 `PageBridgeLayer`，将部分 Service 显式投影给 Page Runtime：

```ts
// App 级 Root Layer：提供 UserStore / ThemeService 等
const AppLayer = Layer.mergeAll(UserStoreLive, ThemeServiceLive)

// Page 级 Root ModuleImpl 依赖桥接后的服务
const PageImpl = PageModule.make({
  initial,
  logics,
  imports: [
    // Page 自己的域内模块
    LocalFeatureImpl,
    // 从 App 注入的服务（通过 Bridge）
    UserStore,
    ThemeService,
  ],
})
```

在实现角度，可以有两条路径：

1.  **单 Runtime 模式（推荐）**：绝大多数后台页面直接运行在同一个 App Runtime 中：
    *   Page 仅通过 ModuleImpl.imports 引入 App 级服务；
    *   Page Keep-Alive 通过 `PageRuntimeCache` 管理“模块实例”，而不是额外创建 Runtime；
2.  **多 Runtime 模式（特殊场景）**：确实需要为 Page 创建独立 Runtime 时：
    *   App 在构造 Page Runtime 时提供一个 Bridge Layer，将 App Runtime 中的部分 Tag 显式注入；
    *   Bridge Layer 自身可以通过 `Effect.context` 或专门 Tag 与 App Runtime 交互，但对 Page Runtime 的消费者仍然是普通的 Tag。

无论哪种模式，都禁止“Page Runtime 在内部查找 App Runtime 上的 Tag”这类隐式冒泡。

### 4.4 小结：协议层约束

综合上述，Page Level Module State Retention 的协议层约束可以总结为：

1.  **Scope 分层**：语义上区分 Data Scope 与 View Scope，Page 休眠只影响 View Scope，Data Scope 的关闭由 Cache/Runtime 管理器控制。
2.  **Lifecycle 驱动**：挂起/恢复由宿主 Platform/React 通过 `Logic.Platform.lifecycle` 驱动，业务 Logic 通过 onSuspend/onResume 注册可暂停任务。
3.  **Cache 管理**：引入 PageRuntimeCache（或等价抽象）作为 LRU 管理器，控制常驻 Page Runtime 的数量，预留冷热分层与持久化扩展点。
4.  **显式依赖**：禁止跨 Runtime 的隐式 Tag 冒泡，所有 Page 对 App 服务的依赖必须通过 ModuleImpl.imports 或 Bridge Layer 显式注入。

## 5. 下一步

*   [ ] 在 `docs/specs/runtime-logix/core/02-module-and-logic-api.md` 中补充 `ModuleLifecycle` 与 Page Lifecycle Protocol 的规范化描述（Level 2/Level 3 建议），并明确 Data Scope / View Scope 的语义边界。
*   [ ] 在 `docs/specs/runtime-logix/impl/` 下补充 PageRuntimeCache / PageBridge 的实现备忘，给出 LRU 策略与冷/热分层的最小实现草图。
*   [ ] 在 `packages/logix-core` / `packages/logix-react` 中选取一个典型后台页面场景（如 `UserDetailPage`），实现最小可用的 Page Keep-Alive PoC：包含 PageRuntimeCache、生命周期驱动与显式 Bridge。
*   [ ] 在 `apps/docs` 中增加“页面级状态保持（Page Keep-Alive）”教程，从业务开发者视角演示如何在路由层使用 PageRuntimeCache 与 RuntimeProvider 组合实现“切走-切回不丢状态”的体验。 
