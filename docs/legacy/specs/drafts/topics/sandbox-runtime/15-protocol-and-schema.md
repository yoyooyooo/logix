---
title: Host ↔ Worker Protocol & Schema
status: draft
version: 2025-12-07
value: core
priority: now
---

# Host ↔ Worker Protocol & Schema

> 本文档定义 Sandbox 主线程（Host）与 Web Worker 之间的完整通信协议与 TypeScript Schema。

## 1. 协议总览

```
Host ────────────────────→ Worker
      INIT / COMPILE / RUN / TERMINATE

Worker ──────────────────→ Host
      READY / LOG / TRACE / UI_INTENT / ERROR / COMPLETE
```

---

## 2. Commands（Host → Worker）

### 2.1 INIT

初始化 Worker，注入 WASM 与 Kernel 入口（`logix-core.js`）。

```typescript
interface InitCommand {
  type: 'INIT'
  payload?: {
    /** 可选：为 Worker 注入环境变量（供用户代码读取） */
    env?: Record<string, unknown>
    /** 可选：esbuild-wasm URL（默认 `/esbuild.wasm`） */
    wasmUrl?: string
    /**
     * 可选：Kernel 入口 URL（默认 `/sandbox/logix-core.js`）。
     * Worker 会按 sibling 约定推导：
     * - effectUrl = sibling(`effect.js`)
     * - manifestUrl = sibling(`logix-core.manifest.json`)
     *
     * multi-kernel（058）场景下，Host 在创建/重建 Worker 时选择对应变体的 kernelUrl 即可；
     * 协议本身不需要携带 kernelId。
     */
    kernelUrl?: string
  }
}
```

### 2.2 COMPILE

编译用户代码。

```typescript
interface CompileCommand {
  type: 'COMPILE'
  payload: {
    /** 入口代码 */
    code: string
    /** 文件名（用于 source map） */
    filename?: string
    /** 可选：Mock 配置（当前 PoC 仅实现 http mock 子集） */
    mockManifest?: MockManifest
  }
}
```

### 2.3 RUN

运行已编译的 Bundle。

```typescript
interface RunCommand {
  type: 'RUN'
  payload: {
    /** 运行 ID（用于 Trace 关联） */
    runId: string
    /** 可选：要发送到 Sandbox 内部的 action（PoC） */
    actions?: { _tag: string; payload?: unknown }[]
    /** 可选：是否使用最近一次 COMPILE 的 bundle（默认 true） */
    useCompiledCode?: boolean
  }
}
```

### 2.4 UI_CALLBACK

Host → Worker 触发 UI 回调（用于响应 `UI_INTENT`）。

```typescript
interface UiCallbackCommand {
  type: 'UI_CALLBACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    data?: unknown
  }
}
```

### 2.5 TERMINATE

终止当前运行（PoC：只做标记，不强制中断执行）。

```typescript
interface TerminateCommand {
  type: 'TERMINATE'
}
```

---

## 3. Events（Worker → Host）

### 3.1 READY

Worker 初始化完成。

```typescript
interface ReadyEvent {
  type: 'READY'
  payload: {
    /** Worker 版本 */
    version: string
    /** 编译器是否已就绪 */
    compilerReady: boolean
  }
}
```

### 3.2 COMPILE_RESULT

编译结果。

```typescript
interface CompileResultEvent {
  type: 'COMPILE_RESULT'
  payload: {
    success: boolean
    bundle?: string
    errors?: string[]
  }
}
```

### 3.3 LOG

日志输出。

```typescript
interface LogEvent {
  type: 'LOG'
  payload: {
    level: 'debug' | 'info' | 'warn' | 'error'
    args: unknown[]
    timestamp: number
  }
}
```

### 3.4 TRACE

Effect/Logix 执行 Trace。

```typescript
interface TraceEvent {
  type: 'TRACE'
  payload: TraceSpan
}

interface TraceSpan {
  spanId: string
  parentSpanId?: string
  name: string
  startTime: number
  endTime?: number
  status: 'running' | 'success' | 'error' | 'cancelled'
  attributes?: Record<string, unknown>
  /** 可选：关联的 Intent ID（用于覆盖率统计） */
  intentId?: string
  /** 关联的 Step ID */
  stepId?: string
}
```

### 3.5 UI_INTENT

UI 组件意图信号（Semantic UI Mock 产出）。

```typescript
interface UiIntentEvent {
  type: 'UI_INTENT'
  payload: UiIntentPacket
}

interface UiIntentPacket {
  /** 唯一标识 */
  id: string
  /** 组件类型（语义组件 ID，如 Select/Button/Modal 等） */
  component: string
  /** 意图类型：生命周期 or 用户行为 */
  intent: 'mount' | 'update' | 'unmount' | 'action'
  /** 组件 Props 摘要 */
  props: Record<string, unknown>
  /** 可触发的回调名称（如 onClick/onChange 等） */
  callbacks: string[]
  /** 子组件意图 */
  children?: UiIntentPacket[]
  /** 视角相关的扩展信息（可选，多视角投影用） */
  meta?: {
    /** 用例/故事 ID（PM/平台视角） */
    storyId?: string
    /** 步骤 ID（用于时间线排序） */
    stepId?: string
    /** 人类可读标签（UI/PM 视角） */
    label?: string
    /** 重要程度（供调试/告警视角使用） */
    severity?: 'info' | 'warn' | 'error'
    /** 任意标签（A/B 版本、渠道等） */
    tags?: string[]
  }
}

// 说明：
// - 上述字段中，id/component/intent/props/callbacks/children 构成协议的“引擎层 SSOT”，任何视角都不应改变其语义；
// - meta 为可选扩展区，用于承载用户故事、步骤、标签等“视角信息”，Host/平台/DevTools 可按需消费或忽略。
```

### 3.6 UI_CALLBACK_ACK

Worker 对 UI 回调的确认（PoC）。

```typescript
interface UiCallbackAckEvent {
  type: 'UI_CALLBACK_ACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    accepted: boolean
    message?: string
  }
}
```

### 3.7 ERROR

运行时错误。

```typescript
interface ErrorEvent {
  type: 'ERROR'
  payload: {
    code: 'INIT_FAILED' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'WORKER_TERMINATED'
    message: string
    stack?: string
  }
}
```

### 3.8 COMPLETE

运行完成。

```typescript
interface CompleteEvent {
  type: 'COMPLETE'
  payload: {
    runId: string
    duration: number
    /** 最终状态快照（Logix Module） */
    stateSnapshot?: unknown
  }
}
```

---

## 4. MockManifest Schema

用于配置 Mock 行为（当前 PoC：仅实现 http mock 的最小子集）。

```typescript
interface MockManifest {
  http?: HttpMockRule[]
}

interface HttpMockRule {
  url: string
  method?: string
  status?: number
  delayMs?: number
  json?: unknown
}
```

---

## 5. 与相关规范的对齐

| 规范                       | 对齐点                                |
| -------------------------- | ------------------------------------- |
| runtime-observability      | `TraceSpan` 结构与 DebugEvent 兼容    |
| devtools-and-studio        | `UI_INTENT` 供 Waterfall/线框视图消费 |
| v3 code-runner-and-sandbox | 协议与 Worker 生命周期一致            |

---

## 6. 参见

- [05-architecture-and-boundary.md](./05-architecture-and-boundary.md) — 架构与边界
- [10-runtime-baseline.md](./10-runtime-baseline.md) — Worker 生命周期与 Watchdog
- [20-dependency-and-mock-strategy.md](./20-dependency-and-mock-strategy.md) — Mock 策略
