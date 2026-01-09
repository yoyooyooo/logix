# Quickstart: 并发护栏与预警（限制无上限并发）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/021-limit-unbounded-concurrency/spec.md`

## 1) 你将获得什么

- 默认并行事件处理不再是“无上限并发”，而是“有上限并发（默认 16）”。
- 当你显式启用无上限并发时，会收到一次高严重度风险提示（可审计）。
- 当系统长时间处于并发饱和/积压状态，会产出结构化诊断信号（含 `configScope`）指导调优。
- 业务 action / 关键 task 通道为必达：压力下会通过背压让入口变慢，而不是静默丢失或无限堆内存；诊断/Trace 等非关键通道允许采样/降噪以避免反向拖垮业务。

## 2) 配置入口（与 013 控制面一致）

本特性的并发控制面入口（实际 API）：

- runtime_default：`Logix.Runtime.make(..., { concurrencyPolicy })`
- runtime_module：`concurrencyPolicy.overridesByModuleId[moduleId]` 或 `Logix.Runtime.setConcurrencyPolicyOverride(runtime, moduleId, patch)`
- provider：`Logix.Runtime.concurrencyPolicyOverridesLayer(overrides)`（局部子树覆盖）

### A. Runtime 默认（runtime_default）

- 在创建 Runtime 时提供默认策略（全局生效）。

```ts
import * as Logix from "@logixjs/core"

const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 16,
    losslessBackpressureCapacity: 4096,
    pressureWarningThreshold: { backlogCount: 1000, backlogDurationMs: 5000 },
    warningCooldownMs: 30_000,
    allowUnbounded: false,
  },
})
```

### B. 按模块覆盖（runtime_module）

- 只对某个 `moduleId` 生效（止血/灰度调参）。

```ts
import * as Logix from "@logixjs/core"

// 方案 1：在 runtime_default 里写 overridesByModuleId
const runtime = Logix.Runtime.make(RootImpl, {
  concurrencyPolicy: {
    concurrencyLimit: 16,
    overridesByModuleId: {
      OrderForm: { concurrencyLimit: 4 },
    },
  },
})

// 方案 2：运行时热切换（排查/止血）
Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", { concurrencyLimit: 4 })
Logix.Runtime.setConcurrencyPolicyOverride(runtime, "OrderForm", undefined)
```

### C. 局部作用域覆盖（scope_override / provider）

- 只对某个局部范围生效（例如 React 子树、会话范围）。
- 优先级最高，下一笔事务/操作窗口生效。

```tsx
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"

const overridesLayer = Logix.Runtime.concurrencyPolicyOverridesLayer({
  concurrencyLimit: 8,
})

export function App({ runtime }: { runtime: any }) {
  return (
    <RuntimeProvider runtime={runtime} layer={overridesLayer}>
      {/* overrides 生效范围 */}
    </RuntimeProvider>
  )
}
```

## 3) 如何验证（对应 spec 的验收场景）

### 场景 1：默认并发上限生效（SC-001）

目标：在高频触发下，in-flight 不会超过 16，系统持续可用。

期望结果：

- 不出现“任务数无限增长”的资源耗尽迹象（CPU/内存持续上升直至卡死）。
- 若持续饱和，出现 `concurrency::pressure` 诊断信号（warning）。

### 场景 2：显式启用无上限并发（SC-004）

目标：开发者显式启用无上限并发时，系统输出一次高严重度提示（error）。

期望结果：

- 配置 `concurrencyLimit="unbounded"` 必须同时显式 `allowUnbounded=true` 才会生效；
- 生效时会发射一次 `concurrency::unbounded_enabled`（severity=error，可被检索到）；
- 如果请求 `"unbounded"` 但未显式 allow：会回退到 bounded 并发，并发射一次 `concurrency::unbounded_requires_opt_in`（severity=error）。

补充：所有 `concurrency::*` 诊断事件的 `trigger.details` 都必须满足 `contracts/concurrency-diagnostic-details.schema.json`（至少 `configScope/limit`，且不得包含额外字段）。

### 场景 3：预警阈值（SC-002）

目标：当积压/饱和达到默认阈值（count>1000 或持续>5s）时，1s 内产出至少一条预警信号。

期望结果：

- `concurrency::pressure` 事件在冷却窗口内不会刷屏（同一触发源合并/降噪）。
  - 合并后的下一条事件会携带：`degradeStrategy="cooldown"` 与 `suppressedCount`（表示冷却窗口内被合并掉的次数）。

### 场景 4：必达背压上界（SC-006）

目标：业务事件不能丢；当达到背压上界时入口延迟上升但积压保持有界。

期望结果：

- 不出现业务事件静默丢失；
- 当持续过载时，入口（dispatch/触发）可观察变慢，但不出现“内存随时间线性增长直到 OOM”的趋势；
- 诊断事件提示“背压/饱和”并给出可执行的调优动作（batch/降低触发频率/改用 runLatest 或拆分任务）。

## 4) 性能证据（NFR-001）

本仓库已有可复现跑道（014），建议用于 Before/After 采样：

- 采样：`pnpm perf collect:quick`
- 输出：按脚本参数指定路径或默认输出（以 014 文档为准）

本特性验收需要至少提供：

- diagnostics off：对代表性跑道的影响 ≤ 2%（见 spec SC-003）
- diagnostics on：预警/提示不超过预算，且事件载荷保持 slim（可序列化）

## 5) 用户文档入口

- `apps/docs/content/docs/guide/advanced/concurrency-control-plane.md`
