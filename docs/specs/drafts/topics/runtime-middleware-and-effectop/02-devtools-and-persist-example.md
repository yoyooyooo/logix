---
title: Devtools + Persist Middleware · EffectOp 一体化示例
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-effectop-middleware-blueprint.md
  - ../runtime-observability/README.md
  - ../runtime-v3-core/README.md
---

# Devtools + Persist Middleware · EffectOp 一体化示例

> 目标：对标 zustand 的 `devtools(persist(f))` 组合中间件，演示在 `EffectOp` 总线下如何通过 Observer / Runner 在 Action / State / Service 边界组合出等价能力，并从业务开发者视角提供接近的使用体验（「引入两个中间件即可」）。

本草案围绕一个简化场景展开：

- 模块：`CounterModule`，state = `{ count: number }`，支持 `inc` / `reset` 两个 action；  
- 中间件需求：  
  - 所有 state 变更需要持久化到浏览器 `localStorage`（类似 `persist`）；  
  - 所有 state 变更需要推送到 Devtools 时间线（类似 `devtools`）；  
  - 两者组合时，应当像 zustand 一样“只在公共入口挂一层”，而不是每个 Flow 手写。

本题不追求完整代码，而是用伪代码展示关键设计点。

---

## 1. 能力拆解：devtools + persist 用 EffectOp 表达什么

从逻辑上拆分：

- **Devtools 能力**：
  - 关注所有 `"state"` 和 `"action"` 边界上的 `EffectOp`；  
  - 对 `"state"` 边界：记录 `stateBefore` 和 `stateAfter`（通过包装的 Effect 收集），连同 `meta` 推送到 DebugSink / Redux DevTools；  
  - 对 `"action"` 边界：记录 action 名称、payload 与对应的 state 变更关联关系。

- **Persist 能力**：
  - 启动时：在 Service 边界跑一次“从 storage 读取初始 state”的 Effect；  
  - 每次 `"state"` 边界完成后：将 `stateAfter` 写入 storage。  

在 `EffectOp` 语境下可以视为：

- Devtools → 一组专注 `"state"` / `"action"` / `"flow"` kind 的 Observer；  
- Persist →  
  - 启动阶段：一个在 Service 边界运行的 Runner（负责从 storage 将快照注入初始 state）；  
  - 运行阶段：一个在 `"state"` 边界的 Observer（负责将新 state 写回 storage）。

---

## 2. Observer/Runner 草图：devtoolsObserver / persistObserver / persistRunner

### 2.1 Devtools Observer（观测 state/action）

```ts
interface DevtoolsConfig {
  readonly name: string
}

interface DevtoolsEvent {
  readonly op: EffectOp<any, any, any>
  readonly stateAfter?: unknown
}

interface DevtoolsSink {
  emit(event: DevtoolsEvent): Effect.Effect<void, never, never>
}

const makeDevtoolsObserver = (
  sink: DevtoolsSink,
  config: DevtoolsConfig,
): Observer => ({
  onOp: (op) =>
    Effect.gen(function* () {
      if (op.meta.kind === "state") {
        // stateAfter 需要通过包装 Effect 收集，简化起见这里略过
        yield* sink.emit({ op })
      } else if (op.meta.kind === "action" || op.meta.kind === "flow") {
        yield* sink.emit({ op })
      }
    }),
})
```

随后通过 `asObserverMiddleware(devtoolsObserver)` 转成 `Middleware`，挂在 `"action"` / `"flow"` / `"state"` 边界即可。

### 2.2 Persist Observer（写回 storage）

```ts
interface PersistConfig {
  readonly storageKey: string
  readonly save: (key: string, value: unknown) => Effect.Effect<void, never, never>
}

const makePersistObserver = (config: PersistConfig): Observer => ({
  onOp: (op) =>
    Effect.gen(function* () {
      if (op.meta.kind !== "state") return
      // 这里假定 stateAfter 已通过包装 Effect 收集
      const stateAfter = /* ... */ op.meta // 占位
      yield* config.save(config.storageKey, stateAfter)
    }),
})
```

同样通过 `asObserverMiddleware` 挂在 `"state"` 边界上即可。

### 2.3 Persist Runner（启动时 rehydrate）

```ts
interface PersistRunnerConfig {
  readonly storageKey: string
  readonly load: (key: string) => Effect.Effect<unknown, never, never>
}

const makePersistRunner = (
  config: PersistRunnerConfig,
): Runner => ({
  run: (op, next) =>
    Effect.gen(function* () {
      if (op.meta.kind !== "lifecycle" || op.meta.name !== "module.init") {
        // 非 init 生命周期，直接穿透
        return yield* next(op)
      }

      // 1) 从 storage 读取快照
      const snapshot = yield* config.load(config.storageKey)

      // 2) 将 snapshot 写入 Module 的 State（简化：假定 effect 内部就是 setState）
      const patchedOp: EffectOp<any, any, any> = {
        ...op,
        meta: {
          ...op.meta,
          tags: [...(op.meta.tags ?? []), "persist:rehydrate"],
        },
        // effect 内部可以根据 snapshot 决定 initial state
      }

      return yield* next(patchedOp)
    }),
})
```

在实际实现中，rehydrate 可能更适合放到 ModuleRuntime 构造路径里，这里只演示“可以由 Runner 负责启动时注入”的思路。

---

## 3. RuntimeConfig / ModuleMeta：像 zustand 一样「串中间件」

### 3.1 Runtime 级 registry

```ts
const registry: RuntimeMiddlewareRegistry = {
  observers: {
    "devtools/basic": makeDevtoolsObserver(devtoolsSink, { name: "Counter" }),
    "persist/localStorage": makePersistObserver({
      storageKey: "counter",
      save: (key, value) => Effect.sync(() => localStorage.setItem(key, JSON.stringify(value))),
    }),
  },
  runners: {
    "persist/rehydrate": makePersistRunner({
      storageKey: "counter",
      load: (key) =>
        Effect.sync(() => {
          const raw = localStorage.getItem(key)
          return raw ? JSON.parse(raw) : undefined
        }),
    }),
  },
  guards: {},
}
```

### 3.2 Runtime 默认：为相关 kind 配一套中间件组

```ts
const defaults: RuntimeMiddlewareDefaults = {
  byKind: {
    state: {
      observers: ["devtools/basic", "persist/localStorage"],
    },
    action: {
      observers: ["devtools/basic"],
    },
    lifecycle: {
      runners: ["persist/rehydrate"], // 在 module.init 生命周期触发 rehydrate
    },
  },
}
```

### 3.3 ModuleMeta：只声明「这个模块要 devtools + persist」

```ts
const CounterModuleMeta: ModuleMeta = {
  // ...
  middleware: {
    state: {
      observers: ["devtools/basic", "persist/localStorage"],
    },
    action: {
      observers: ["devtools/basic"],
    },
    lifecycle: {
      runners: ["persist/rehydrate"],
    },
  },
}
```

在最终拼装时，Runtime 会将：

- Runtime 默认 + ModuleMeta + FlowOptions 的覆盖结果，转成对应 kind 的 `Middleware[]`；  
- 再由 Action / Flow / State / Lifecycle 边界包装函数构造 `EffectOp` 并调用 `composeMiddleware`。

对业务开发者来说，可以进一步封装成一个上层 API：

```ts
const CounterModule = Logix.Module.make("Counter", shape).withMiddlewarePreset(
  Logix.Presets.devtoolsAndPersist({
    storageKey: "counter",
    devtoolsName: "CounterModule",
  }),
)
```

`withMiddlewarePreset` 内部只需填好 `ModuleMeta.middleware`，不暴露 `EffectOp` 细节。

---

## 4. 压力测试结论

在 `EffectOp` 总线下：

- Devtools 能力可以自然表达为一组 Observer：订阅 `"state"` / `"action"` / `"flow"` 边界的 EffectOp；  
- Persist 能力可以拆成：  
  - `"state"` 边界上的 Observer（写回 storage）；  
  - `"lifecycle:init"` 或 runtime bootstrap 阶段的 Runner（rehydrate 初始 state）；  
- 两者的组合不需要额外发明新模型，只需在 ModuleMeta / RuntimeConfig 中为相应边界挂上对应 key。

与 zustand 相比：

- 在能力维度：可以覆盖甚至更细致（多种边界 + Tracer/DebugSink 协同）；  
- 在 DX 维度：需要提供如 `withMiddlewarePreset` 之类的封装，让普通用户通过少量配置获得 “devtools + persist” 套餐，而无需理解 `EffectOp` / registry 细节。

本草案只定义了一个典型组合的形状，后续可以用类似方式定义：

- `logger` 预设（仅 Devtools Observer + Console Observer）；  
- `strictRetry` 预设（Service Runner + Error Guard）；  
- `auditSensitiveState` 预设（State Observer + Guard）。
