---
title: 并发控制面
description: 通过 Runtime/模块/Provider 覆盖，限制并行 watcher/task 的并发上限，并在背压/饱和时给出可定位预警；支持显式启用无上限并发（含审计提示）。
---

这份指南解决两个现实问题：

1. 你想用并行 watcher（例如 `runParallel`）提升吞吐，但不希望在突发流量下“任务越跑越多直至卡死”。
2. 你偶尔确实需要“无上限并发”（例如一次性 fan-out），但希望它是**显式的、可审计的**，并且能被诊断信号捕捉到。

## 你将获得什么

- **默认安全**：并行 watcher / 并行任务默认会被限制并发上限（默认 16）。
- **必达背压**：压力下不会静默丢事件；当内部缓冲达到上界时会通过背压让入口变慢（而不是无限堆内存）。
- **结构化预警**：当系统持续饱和/积压时输出 `concurrency::pressure`（含 `configScope` 等可定位信息）。
- **无上限需要显式许可**：只有在显式 `allowUnbounded=true` 时，`concurrencyLimit="unbounded"` 才会生效；生效时会输出一次高严重度审计提示。

> 说明：本控制面主要约束 Logix 提供的并行入口（例如 Flow watcher 的并行模式与 TaskRunner 并行模式），不会自动改写你在业务代码里手写的并发（例如你自己写的 `Effect.all({ concurrency: "unbounded" })`）。

## 默认值（建议先记住这组）

- `concurrencyLimit = 16`
- `allowUnbounded = false`
- `losslessBackpressureCapacity = 4096`
- `pressureWarningThreshold = { backlogCount: 1000, backlogDurationMs: 5000 }`
- `warningCooldownMs = 30000`

## 覆盖范围与优先级

你可以在三层注入并发策略：

1. **Runtime 默认（runtime_default）**：全局默认值
2. **按模块覆盖（runtime_module）**：只对某个 `moduleId` 生效（止血/灰度调参）
3. **Provider 子树覆盖（provider）**：只对某棵子树生效（例如某个页面/会话范围）

优先级：`provider > runtime_module > runtime_default > builtin`  
生效时机：从**下一笔事务/操作窗口**开始生效（不会打断正在执行的一笔交互）。

## 常用配方

### 配方 A：全局调小默认并发（更稳）

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 8,
  },
})
```

### 配方 B：只对某个模块止血（推荐）

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 16,
    overridesByModuleId: {
      OrderForm: { concurrencyLimit: 4 },
    },
  },
})
```

### 配方 C：运行时热切换某个模块（排查/止血）

```ts
import * as Logix from "@logixjs/core"

Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", { concurrencyLimit: 4 })
// 取消覆盖：传 undefined
Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", undefined)
```

### 配方 D：在 Provider 子树范围内覆盖（页面级试探）

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const overrides = Logix.Runtime.concurrencyPolicyOverridesLayer({
  concurrencyLimit: 8,
  overridesByModuleId: {
    OrderForm: { concurrencyLimit: 4 },
  },
})

export function App({ runtime }: { runtime: Logix.ManagedRuntime<any, any> }) {
  return (
    <RuntimeProvider runtime={runtime} layer={overrides}>
      {/* 这棵子树下生效 */}
    </RuntimeProvider>
  )
}
```

### 配方 E：显式启用无上限并发（谨慎）

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: "unbounded",
    allowUnbounded: true,
  },
})
```

启用后会输出一次高严重度诊断事件 `concurrency::unbounded_enabled`（可审计）。  
如果你只设置了 `concurrencyLimit="unbounded"` 但忘了 `allowUnbounded=true`，系统会回退到有界并发并输出 `concurrency::unbounded_requires_opt_in`。

## 诊断信号怎么读

### `concurrency::pressure`（warning）

表示出现背压/饱和（例如内部缓冲达到上界、或持续等待）。建议按这个顺序排查：

1. 先降低触发频率（debounce/throttle/batch）
2. 选择更合适的 watcher 模式（例如从“全并行”改为 `runLatest` 或 `runExhaust`）
3. 再做调参（提高 `concurrencyLimit` / 调整背压上界与阈值）

该事件的 `trigger.details` 至少包含：

- `configScope`：当前生效配置来自哪个层级
- `limit`：当前并发上限（整数或 `"unbounded"`）
- 以及 `backlogCount/saturatedDurationMs/threshold/cooldownMs/degradeStrategy/suppressedCount` 等辅助字段（用于判断是否刷屏合并、以及压力持续程度）

### `concurrency::unbounded_enabled`（error）

表示某个实例启用了无上限并发（审计提示，只提示一次）。  
建议仅在“短时、可控、可取消”的 fan-out 场景使用，并确保上层有明确的流量边界。

### `concurrency::unbounded_requires_opt_in`（error）

表示请求了无上限并发，但未显式允许，因此系统回退到有界并发（只提示一次）。

## 常见问题（FAQ）

### Q1：我设置了 override，但感觉没生效？

最常见的原因：

1. **生效时机**：从下一笔事务开始生效
2. **moduleId 写错**：确认它就是 `Logix.Module.make("...")` 的 id
3. **更高优先级覆盖了你**：例如子树内又包了一层 Provider override
