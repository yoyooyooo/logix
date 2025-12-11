title: React Module Runtime Config (Effect.Config)
status: draft
version: 0.1.0
layer: Topic
value: core
priority: next
related:
  - ./01-lifecycle-and-scope.md
  - ./02-unified-resource-cache.md
  - ./03-session-keepalive-pattern.md
  - ../../../runtime-logix/core/07-react-integration.md
---

## 背景与动机

在 `@logix/react` 中，模块运行时生命周期已经引入了统一的 `ModuleCache`：

- `gcTime` 用于控制「无人持有后的保活时间」，解决 StrictMode 抖动与 Session 保活；
- Suspense 模式通过 `read()` 在 Render 阶段触发异步构建并抛出 Promise；
- 最近为避免「初始化期间被 GC 导致 Suspense 永远 pending」的问题，Cache 在 GC 时会检测 `status === "pending"` 并延迟回收。

这带来了一个新的需求：

- 在一些业务场景下，模块的初始化可能由多步组成，且整体耗时存在上界（例如远程配置 + 索引构建）；
- 有的场景希望「只要在初始化，就绝不 GC」；
- 有的场景则希望「初始化超时就放弃，不要长期占用资源」；
- 这些默认策略应当**统一管理在 Runtime 层**，而不是散落在每个 `useModule` 调用点。

因此需要在 React 适配层引入一套**模块运行时配置机制（React Module Runtime Config）**：

- 使用 Effect 原生的 `Config` 体系承载「默认值」与「全局覆盖」；
- 允许应用级统一配置（per Runtime，基于 ConfigProvider）；
- 仍保留 `useModule` 调用点的显式覆盖能力；
- 不向 `@logix/core` 暴露任何 React 专用配置类型。

## 设计目标

1. **包边界清晰**
   - `@logix/core` 保持平台无关，不增加 React 专用配置；
   - 所有与 React Hook / Suspense / GC 策略相关的配置都在 `@logix/react` 内定义。

2. **配置多层覆盖**
   - 优先级：`useModule` 调用点显式 `options` > Runtime Env 中的 ConfigProvider（Effect.Config）> 包内默认常量；
   - 允许不同 Runtime 使用不同默认配置（例如后台应用 vs 纯展示应用）。

3. **保持 RuntimeProvider 契约简单**
   - React 层仍只依赖 `RuntimeProvider` 的 `runtime`（以及可选 `layer/enabled` 等既有参数）；
   - 新配置通过 Runtime 构建时提供 ConfigProvider 注入，不增加 React 全局单例或额外 Provider。

4. **与现有 ModuleCache / Session Pattern 对齐**
   - `gcTime` 继续只描述「无人持有后的保活时间」，与初始化时长解耦；
   - 提供一个统一的「初始化超时」配置，用于控制 Suspense 模式下的整体初始化上界。

## API 草案：包边界与实现方式（基于 Effect.Config）

### 1. `@logix/core`

`@logix/core` 不增加额外导出，仅通过文档约定：

- Runtime 构造时可以在 `layer` 中包含 ConfigProvider（通过 Effect.Config 体系注入配置值）；
- `@logix/react` 作为普通依赖方，在内部通过 `Config.*` 读取所需配置。

```ts
// 仅示意：Runtime 仍然只暴露通用 Layer/Env 能力
export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never>
  // ...
}
```

### 2. `@logix/react` 内部配置键（不对外暴露）

在 `@logix/react` 内部定义一组标准化的 Config 键，用于承载默认值与全局覆盖：

```ts
// packages/logix-react/src/internal/config.ts（仅内部使用）
import { Config } from "effect"

export const ReactModuleConfig = {
  /**
   * 默认的 gcTime（毫秒），用于 ModuleCache 的闲置保活时间。
   * - 适用于未在 useModule(options.gcTime) 中显式指定的场景；
   * - 典型默认值：500ms（StrictMode 抖动保护）。
   */
  gcTime: Config.number("logix.react.gc_time").pipe(
    Config.withDefault(500),
  ),

  /**
   * 默认的初始化超时时间（毫秒），仅在 suspend:true 场景下生效。
   * - 使用 Option<number> 表达“可选配置”：None 表示默认不对初始化做超时控制；
   * - 调用方在使用时可将 Option.none 映射为 undefined。
   */
  initTimeoutMs: Config.option(
    Config.number("logix.react.init_timeout_ms"),
  ),
}
```

说明：

- 这些 Config 键是 `@logix/react` 的内部实现细节，不作为公共 API 暴露；
- 调用方通过标准的 ConfigProvider（`ConfigProvider.fromEnv/fromMap/...`）为这些键提供值；
- 若未提供，`gcTime` 使用 `Config.withDefault(500)` 的默认值，`initTimeoutMs` 为 `Option.none`（视为未启用）。

## 配置解析优先级与行为

### 1. `gcTime` 的优先级与语义

最终用于 `ModuleCache` 的 `gcTime`（Entry 级别）按如下优先级决定：

1. `useModule(handle, { gcTime })`：调用点显式配置；
2. Runtime Env 中的 ConfigProvider 为键 `logix.react.gc_time` 提供的数值；
3. 包内默认常量（`Config.withDefault(500)`）。

语义保持与 `02-unified-resource-cache.md` 一致，并结合当前实现的补充约定：

- `gcTime` 描述的是「从最后一次 `refCount` 从 1 降到 0 之后的闲置时间」；
- 只有在 `refCount === 0` 且 `status === "success" | "error"` 时，GC 才会真正关闭 Scope 并删除 Entry；
- 若在 GC 定时器触发时仍为 `status === "pending"`（例如异步 Layer 仍在初始化），则：
  - 不会执行 GC；
  - 会清除当前 `gcTimeout` 并按相同 `gcTime` 重新调度一次；
  - 直到初始化完成进入 `success/error` 状态，才按正常规则执行 GC。

> 这意味着：`gcTime` 不再与「初始化耗时」直接绑定。初始化期间不会因为 `gcTime` 到期而被 GC，避免 Suspense 永远挂起。

### 2. `initTimeoutMs` 的优先级与语义

`initTimeoutMs` 仅在 `suspend: true` 场景中生效，用于控制「整体初始化过程」的最大耗时（含 Layer 构建）。

优先级：

1. `useModule(handle, { suspend: true, initTimeoutMs })` 显式配置；
2. Runtime Env 中的 ConfigProvider 为键 `logix.react.init_timeout_ms` 提供的数值（通过 Option<number> 表达）；
3. 默认 `Option.none` → `undefined`（不做初始化超时控制）。

内部消费示例：

```ts
const timeoutOpt = yield* ReactModuleConfig.initTimeoutMs
const initTimeoutMs = Option.getOrUndefined(timeoutOpt)
```

实现建议（与当前 PoC 一致）：

```ts
// useModule.ts 内部
const baseFactory: ModuleResourceFactory = (scope) =>
  Layer.buildWithScope(handle.layer, scope).pipe(
    Effect.map((context) =>
      Context.get(context, handle.module) as Logix.ModuleRuntime<...>,
    ),
  )

const factory: ModuleResourceFactory =
  !suspend || initTimeoutMs === undefined
    ? baseFactory
    : (scope) =>
        baseFactory(scope).pipe(
          Effect.timeoutFail({
            duration: initTimeoutMs,
            onTimeout: () =>
              new Error(
                `[useModule] Module "${ownerId}" initialization timed out after ${initTimeoutMs}ms`,
              ),
          }),
        )
```

语义：

- `initTimeoutMs` 控制的是「整体初始化 Effect」的最大耗时，而不是单个子步骤；
- 超时会以 **错误** 结束该 Entry：
  - `ModuleCache` 将 Entry 标记为 `status: "error"`，并将 `gcTime` 切换为短周期 `ERROR_GC_DELAY_MS`；
  - 调用方在 React 树中可通过 ErrorBoundary 或自定义边界捕获该错误，决定重试 / 降级。

### 3. 调用点 Options 的整合

`useModule` 的 options 草案更新为（仅示意，具体签名在实现时对齐现有重载）：

```ts
interface UseModuleOptions<Sh> {
  key?: string
  gcTime?: number
  suspend?: boolean
  deps?: React.DependencyList

  /** 仅在 suspend:true 时生效 */
  initTimeoutMs?: number
}
```

优先级总结：

- `gcTime`：`options.gcTime` > Config(`logix.react.gc_time`) > 包内默认（500ms）；
- `initTimeoutMs`：`options.initTimeoutMs` > Config(`logix.react.init_timeout_ms`) > `undefined`。

## 使用示例（应用与模块维度）

### 1. 应用级：为整个 Runtime 配置默认策略（基于 ConfigProvider）

```ts
import * as Logix from "@logix/core"
import { RuntimeProvider, ReactPlatformLayer } from "@logix/react"
import { Config, ConfigProvider, Layer } from "effect"

const ReactConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map<string, string>([
      ["logix.react.gc_time", "1000"],      // 无人持有 1s 后 GC
      ["logix.react.init_timeout_ms", "30000"], // suspend 初始化 30s 超时
    ]),
  ),
)

const runtime = Logix.Runtime.make(rootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer).pipe(
    Layer.provide(ReactConfigLayer),
  ),
})

// React 树中仍然只需要 RuntimeProvider
const AppRoot: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <AppRoutes />
  </RuntimeProvider>
)
```

### 2. 模块级：特殊模块的显式覆盖

```ts
const HeavyModuleImpl = HeavyModule.implement({ /* ... */ })

const HeavyView: React.FC = () => {
  const runtime = useModule(HeavyModuleImpl, {
    suspend: true,
    key: "Heavy:Report-2025",
    // 比默认更宽松的初始化超时
    initTimeoutMs: 120_000,
    // 会话级保活：无人持有后 10 分钟内切回可复用
    gcTime: 10 * 60_000,
  })

  // ...
}
```

## 迁移与兼容性说明

1. **非 React 代码 & `@logix/core` 完全不受影响**  
   - 配置仅存在于 `@logix/react` 的内部实现，通过 Effect.Config 读取；
   - `@logix/core` 的 Runtime/Module API 不需要修改。

2. **现有 `useModule` 调用保持兼容**  
   - 不传 `gcTime` / `initTimeoutMs` 时，行为与当前实现兼容（`gcTime` 继续默认为 500ms，初始化默认无限等待）；
   - 仅当应用通过 ConfigProvider 或在 options 中显式配置时，才会改变默认行为。

3. **文档与实现的后续工作**
   - 将本草案与 `02-unified-resource-cache.md`、`03-session-keepalive-pattern.md` 一起收敛到 `runtime-logix` SSoT 中；
   - 在 `docs/specs/runtime-logix/core/07-react-integration.md` 中补充「基于 Effect.Config 的 React 模块运行时配置」章节；
   - 在 `@logix/react` 包内部实现上述 Config 键的读取逻辑，并与 `ModuleCache` / `useModule` 对齐。

> 当前文档定位为 Topic 级草案（约 L3–L4）：问题与 API 形状基本清晰，但具体默认值与键名仍可在实现/回归过程中微调。后续若行为稳定，应同步更新到 runtime-logix SSoT，并将本草案标记为 `status: merged` 或降级优先级。
