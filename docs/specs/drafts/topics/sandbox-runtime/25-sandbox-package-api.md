---
title: '@logix/sandbox Package API Design'
status: draft
version: 2025-12-07
value: core
priority: next
---

# @logix/sandbox Package API Design

> 本文档定义 `@logix/sandbox` 子包的结构与公开 API 设计。

## 1. 包结构

```
@logix/sandbox/
├── src/
│   ├── client/                    # Host 侧 SDK
│   │   ├── SandboxClient.ts       # 主 API
│   │   ├── protocol.ts            # 协议类型定义
│   │   └── index.ts
│   │
│   ├── worker/                    # Worker 侧内核
│   │   ├── index.ts               # Worker 入口
│   │   ├── compiler.ts            # esbuild-wasm 封装
│   │   ├── runtime.ts             # Effect/Logix 运行环境构造
│   │   └── plugins/               # esbuild 插件集
│   │       ├── kernel-resolve.ts  # Kernel 重写（effect/@logix/core → kernelUrl）
│   │       ├── utility-cdn.ts     # Utility → CDN (esm.sh / etc.)
│   │       ├── universal-spy.ts   # IO/SDK → Spy
│   │       └── semantic-ui.ts     # UI → Semantic UI Mock（UI_INTENT 信号）
│   │
│   ├── mocks/                     # 内置 Mock 库
│   │   ├── universal-spy.ts       # 递归 Proxy Mock（IO/SDK）
│   │   └── semantic-ui/           # UI 组件 Headless Mock / Semantic Mock
│   │       ├── index.ts
│   │       ├── Button.ts
│   │       ├── Modal.ts
│   │       └── ...
│   │
│   ├── react/                     # React 适配
│   │   ├── useSandbox.ts          # Hook
│   │   ├── SandboxProvider.tsx    # Context Provider
│   │   └── index.ts
│   │
│   └── index.ts                   # 主入口
│
├── worker.ts                      # Worker 构建入口（单独打包）
└── package.json
```

---

## 2. Client API

### 2.1 SandboxClient

主 API，封装 Worker 管理与协议交互。

```typescript
import { Effect, Layer } from 'effect'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface SandboxClientConfig {
  /** Worker 脚本 URL */
  workerUrl: string
  /** esbuild-wasm URL */
  wasmUrl: string
  /**
   * Kernel URL：
   * - 理想形态：可支持多个 Kernel Blob（不同版本 / 运行时），以 Record 形式传入；
   * - 当前 PoC：intent-flow 仓库内实现为单一 `kernelUrl`（字符串），与 Vite 插件默认挂载路径对齐。
   */
  kernelBlobUrls: Record<string, string>
  /** 超时时长 (ms)，默认 5000 */
  timeout?: number
}

interface CompileResult {
  success: boolean
  bundle?: string
  errors?: string[]
  warnings?: string[]
}

interface RunResult {
  runId: string
  duration: number
  stateSnapshot?: unknown
  traces: TraceSpan[]
  logs: LogEntry[]
  uiIntents: UiIntentPacket[]
}

// ─────────────────────────────────────────────
// SandboxClient Interface
// ─────────────────────────────────────────────

interface SandboxClient {
  /**
   * 初始化 Worker
   */
  readonly init: Effect.Effect<void, SandboxError>

  /**
   * 编译代码
   */
  readonly compile: (code: string, manifest: MockManifest) => Effect.Effect<CompileResult, SandboxError>

  /**
   * 运行编译后的代码
   */
  readonly run: (options: {
    runId?: string
    env?: Record<string, unknown>
    intentId?: string
  }) => Effect.Effect<RunResult, SandboxError>

  /**
   * 编译并运行（便捷方法）
   */
  readonly compileAndRun: (
    code: string,
    manifest: MockManifest,
    options?: {
      env?: Record<string, unknown>
      intentId?: string
    },
  ) => Effect.Effect<RunResult, SandboxError>

  /**
   * 终止当前运行
   */
  readonly terminate: Effect.Effect<void>

  /**
   * 触发 UI 回调（响应 UI_INTENT）
   */
  readonly triggerUiCallback: (
    intentId: string,
    callback: string,
    payload?: unknown,
  ) => Effect.Effect<void, SandboxError>

  /**
   * 销毁 Worker
   */
  readonly dispose: Effect.Effect<void>
}

// ─────────────────────────────────────────────
// Service Tag
// ─────────────────────────────────────────────

class SandboxClientTag extends Context.Tag('SandboxClient')<SandboxClientTag, SandboxClient>() {}

// ─────────────────────────────────────────────
// Layer 构造
// ─────────────────────────────────────────────

const SandboxClientLive = (config: SandboxClientConfig): Layer.Layer<SandboxClient> =>
  Layer.succeed(SandboxClientTag, makeSandboxClient(config))
```

### 2.3 当前 PoC 实现对齐情况（本仓约定）

> 说明：本节描述的是 **intent-flow 仓库内当前 @logix/sandbox 的 PoC 状态**，用于约束实现与文档的一致性；如与上文理想形态冲突，以本节与代码为准，再迭代 Spec。

- 配置形态：  
  - 目前 `packages/logix-sandbox/src/client.ts` 中的配置为更简化版：  
    ```ts
    export interface SandboxClientConfig {
      readonly workerUrl?: string
      readonly timeout?: number
      readonly wasmUrl?: string
      readonly kernelUrl?: string
    }
    ```  
  - 其中 `kernelUrl` 与本节的 `kernelBlobUrls` 概念对齐，但仅支持单一 Kernel；多 Kernel/多运行时的能力留待后续扩展。
- 默认 URL：  
  - 未显式传入时：  
    - `wasmUrl` 默认 `/esbuild.wasm`；  
    - `kernelUrl` 默认解析为 `window.location.origin + "/sandbox/logix-core.js"`（在非浏览器环境下退化为 `/sandbox/logix-core.js`）。  
  - 依赖 Vite 插件 `logixSandboxKernelPlugin` 在 dev 和 build 阶段挂载对应静态资源（详见 `10-runtime-baseline.md` 4.1）。
- 错误语义：  
  - 当前 `SandboxClient` 的错误通道尚未完全用 `SandboxError` 收敛：  
    - Host 侧 Effect 封装（`SandboxClientLayer`）对外仍以 `unknown` 作为错误类型；  
    - 下一步需要在 `service.ts` 中引入 `SandboxError` 并在 `Effect.tryPromise` 边界统一转换。  
- 流式事件：  
  - 实现中已经提供 `events: Stream< { status; logs; traces; error } >`，用于 Host 侧订阅运行状态；  
  - UI_INTENT 事件与 Mock/Spy 的结构化输出尚未接入，待协议与 Schema 在 `15-protocol-and-schema.md` / `20-dependency-and-mock-strategy.md` 中收敛后补齐。

### 2.2 错误类型

```typescript
class SandboxError extends Data.TaggedError('SandboxError')<{
  readonly code: 'INIT_FAILED' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'WORKER_TERMINATED'
  readonly message: string
  readonly cause?: unknown
}> {}
```

---

## 3. React API

### 3.1 useSandbox Hook

```typescript
interface UseSandboxOptions {
  /** 初始代码 */
  code?: string
  /** Mock 配置 */
  manifest?: MockManifest
  /** 是否自动初始化 */
  autoInit?: boolean
}

interface UseSandboxResult {
  // 状态
  status: 'idle' | 'initializing' | 'ready' | 'compiling' | 'running' | 'error'
  error: SandboxError | null

  // 结果
  compileResult: CompileResult | null
  runResult: RunResult | null

  // 操作
  init: () => Promise<void>
  compile: (code: string, manifest?: MockManifest) => Promise<CompileResult>
  run: (options?: RunOptions) => Promise<RunResult>
  compileAndRun: (code: string, manifest?: MockManifest) => Promise<RunResult>
  terminate: () => void
  triggerUiCallback: (intentId: string, callback: string, payload?: unknown) => void

  // 流式数据（订阅）
  logs: LogEntry[]
  traces: TraceSpan[]
  uiIntents: UiIntentPacket[]
}

function useSandbox(options?: UseSandboxOptions): UseSandboxResult
```

### 3.2 SandboxProvider

```typescript
interface SandboxProviderProps {
  config: SandboxClientConfig
  children: React.ReactNode
}

function SandboxProvider({ config, children }: SandboxProviderProps): JSX.Element

// 配合 Hook 使用
function useSandboxClient(): SandboxClient
```

---

## 4. 与 @logix/core 的集成

### 4.1 RuntimeEnv 构造

Worker 内通过 Layer 组合构造运行环境：

```typescript
// worker/runtime.ts
import { Layer } from 'effect'
import { Platform } from '@logix/core'

const SandboxRuntimeEnv = Layer.mergeAll(
  // 基础设施
  ConsoleProxyLayer, // console → LOG 事件
  HttpProxyLayer, // fetch → Mock/Spy
  TracerLayer, // Effect Tracer → TRACE 事件

  // Logix 平台
  Platform.Live, // 标准 Platform 服务
  DebugSinkLayer, // 调试事件输出
)
```

### 4.2 Module 运行

```typescript
// 在 Worker 中运行 Logix Module
const runModule = (moduleCode: string, manifest: MockManifest): Effect.Effect<RunResult, SandboxError> =>
  Effect.gen(function* () {
    // 1. 编译
    const bundle = yield* compile(moduleCode, manifest)

    // 2. 构造环境
    const env = yield* Effect.provide(SandboxRuntimeEnv, MockLayer(manifest))

    // 3. 执行
    const result = yield* eval(bundle).pipe(
      Effect.provide(env),
      Effect.timeout(Duration.seconds(5)),
      Effect.catchAll(handleError),
    )

    return result
  })
```

### 4.3 Effect-Native 内部封装（建议形态）

> 目标：在 Sandbox 内部也遵守 Effect/Logix 的分层习惯，避免后续引入 Mock/Spy/UI_INTENT 时出现“散点式”改动。

建议将 Worker 侧内核拆分为若干 Effect-Native 层，并通过 `Layer.mergeAll` 组合：

- `Compiler.Live`：  
  - 封装 `esbuild-wasm` 初始化与编译逻辑；  
  - 接收 `MockManifest` 与 Allowlist，并通过插件组合实现 Kernel/Utility/Spy/UI Mock 的 import 重写。  
- `RuntimeEnv.Live`：  
  - 组合 `ConsoleProxyLayer` / `HttpProxyLayer` / `TracerLayer` / `DebugSinkLayer` / `Platform.Live` 等；  
  - 对外暴露一个统一的 `SandboxRuntimeEnv` Layer，供 `runModule` / `runProgram` 使用。  
- `Spy.Live` / `SemanticUiMock.Live`：  
  - 提供 IO/SDK Mock 与 UI Mock 的 Tag+Layer 封装，内部负责向 Trace/UI_INTENT 管道写入记录；  
  - 与 Host 侧的 Mock 控制面板（MockManifest）通过协议字段解耦。  

当前 PoC 阶段可以只实现上述 Layer 的“骨架”（接口 + 占位实现），先统一调用路径，再逐步替换内部细节：

- Worker 入口仅调用 `SandboxRuntime.run(code, manifest)` 一类的 Effect API，不直接操作 `esbuild` / `Logger` / `postMessage`；  
- 所有 Mock/Spy/UI_INTENT 行为通过 Tag/Layer 注入，方便未来在 Deno 逃生舱或测试环境中复用相同的契约。

### 4.4 当前 PoC 默认行为（@logix/sandbox 已内置）

- HTTP Mock：Host 在 `COMPILE` 时传入 `mockManifest.http`，Worker 会在最近一次编译产物上安装 fetch 代理，命中规则则返回 mock 响应并写入 `TRACE(kind:"http")`，未命中则真实发起并记录。  
- UI Intent：Worker 暴露 `__logixSandboxUiIntent(packet)`，Semantic UI Mock 或用户代码调用后会发出 `UI_INTENT` 事件，Host 负责渲染与交互。  
- Spy：Worker 暴露 `__logixSandboxSpy(payload)`，将 payload 写入 `TRACE(kind:"spy")`，可供未来的 Universal Spy 或自定义 SDK Hook 复用。  
- Logix Debug：若 `kernelUrl` 可访问 `@logix/core`，Worker 默认提供 DebugSink（source=`logix`），把 Debug 事件写入 LOG；`trace:*` 事件同时映射到 `TRACE(kind:"logix-debug")`，与页面 Debug 面板对齐。  
- 职责边界：Host/业务示例负责生成 MockManifest、决定是否展示内置 Debug/HTTP/UI 视图；包内只提供协议、Worker 管线与默认桥接。

---

## 5. 落实优先级

| 优先级 | 组件                     | 说明                                     |
| ------ | ------------------------ | ---------------------------------------- |
| **P0** | `SandboxClient` 核心 API | `init` / `compile` / `run` / `terminate` |
| **P0** | 协议类型定义             | Commands / Events                        |
| **P1** | `useSandbox` Hook        | React 集成                               |
| **P1** | Worker 编译链路          | esbuild-wasm + Kernel 注入               |
| **P2** | Universal Spy            | IO/SDK Mock                              |
| **P2** | Semantic UI Mock         | 基础组件（Modal/Button）                 |
| **P3** | `SandboxProvider`        | Context 管理                             |

---

## 6. 参见

- [15-protocol-and-schema.md](./15-protocol-and-schema.md) — 协议与 Schema 定义
- [05-architecture-and-boundary.md](./05-architecture-and-boundary.md) — 架构与边界
- [20-dependency-and-mock-strategy.md](./20-dependency-and-mock-strategy.md) — 依赖治理
