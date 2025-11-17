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
├── src/                           # SSoT（当前实现）
│   ├── Client.ts                  # Host SDK（创建 Worker / init / compile / run / trialRunModule）
│   ├── Protocol.ts                # Host↔Worker 协议类型
│   ├── Types.ts                   # DTO（RunResult/MockManifest/Trace 等）
│   ├── Service.ts                 # Effect Service（SandboxClientTag + Layer）
│   ├── Vite.ts                    # Vite plugin 导出（静态资产挂载/输出）
│   ├── index.ts                   # 主入口
│   └── internal/                  # 下沉实现（compiler/worker/kernel plugin 等）
└── package.json
```

---

## 2. Client API

### 2.1 SandboxClient

主 API，封装 Worker 管理与协议交互。

```ts
import type {
  DiagnosticsLevel,
  KernelId,
  KernelRegistry,
  KernelVariant,
  MockManifest,
  RunResult,
  SandboxClientState,
} from '@logix/sandbox'

export interface SandboxClientConfig {
  readonly workerUrl?: string
  readonly timeout?: number
  readonly wasmUrl?: string
  /** 单内核（兼容/过渡形态）：只提供一个 kernelUrl。 */
  readonly kernelUrl?: string
  /** 多内核（058）：Host 注册 kernels + defaultKernelId。 */
  readonly kernelRegistry?: KernelRegistry
}

export class SandboxClient {
  getState(): SandboxClientState
  subscribe(listener: (state: SandboxClientState) => void): () => void

  listKernels(): { readonly kernels: ReadonlyArray<KernelVariant>; readonly defaultKernelId?: KernelId }

  init(): Promise<void>

  compile(
    code: string,
    filename?: string,
    mockManifest?: MockManifest,
    options?: { readonly kernelId?: KernelId; readonly strict?: boolean; readonly allowFallback?: boolean },
  ): Promise<{ success: boolean; bundle?: string; errors?: string[] }>

  run(options?: {
    readonly runId?: string
    readonly actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>
    readonly useCompiledCode?: boolean
    readonly kernelId?: KernelId
    readonly strict?: boolean
    readonly allowFallback?: boolean
  }): Promise<RunResult>

  trialRunModule(options: {
    readonly moduleCode: string
    readonly moduleExport?: string
    readonly runId?: string
    readonly buildEnvConfig?: Record<string, string | number | boolean>
    readonly diagnosticsLevel?: DiagnosticsLevel
    readonly maxEvents?: number
    readonly trialRunTimeoutMs?: number
    readonly closeScopeTimeout?: number
    readonly reportMaxBytes?: number
    readonly filename?: string
    readonly mockManifest?: MockManifest
    readonly kernelId?: KernelId
    readonly strict?: boolean
    readonly allowFallback?: boolean
  }): Promise<RunResult>

  uiCallback(payload: { runId: string; intentId: string; callback: string; data?: unknown }): Promise<void>
  terminate(): void
}
```

### 2.3 当前 PoC 实现对齐情况（本仓约定）

> 说明：本节描述的是 **intent-flow 仓库内当前 @logix/sandbox 的 PoC 状态**，用于约束实现与文档的一致性；如与上文理想形态冲突，以本节与代码为准，再迭代 Spec。

- 配置形态（SSoT=代码）：  
  - 当前实现位于 `packages/logix-sandbox/src/Client.ts`，支持单 `kernelUrl` 与多内核 `kernelRegistry`；  
  - multi-kernel 默认 `strict=true`（strict by default），fallback 必须显式允许且目标固定为 `defaultKernelId`。
- 默认 URL：  
  - 未显式传入时：  
    - `wasmUrl` 默认 `/esbuild.wasm`；  
    - `kernelUrl` 默认解析为 `window.location.origin + "/sandbox/logix-core.js"`（在非浏览器环境下退化为 `/sandbox/logix-core.js`）。  
  - 依赖 Vite 插件 `logixSandboxKernelPlugin` 在 dev 和 build 阶段挂载对应静态资源（详见 `10-runtime-baseline.md` 4.1）。
- runId（确定性标识）：  
  - Host 应优先显式提供 `runId`（便于对比/回放/门禁）；  
  - 未提供时，Client 默认使用实例内递增序号（不使用随机/时间戳）。
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
- UI Intent：Worker 暴露 `globalThis.logixSandboxBridge.emitUiIntent(packet)`（并同时挂载到 `Symbol.for("@logix/sandbox/bridge")`），Semantic UI Mock 或用户代码调用后会发出 `UI_INTENT` 事件，Host 负责渲染与交互。  
- Spy：Worker 暴露 `globalThis.logixSandboxBridge.emitSpy(payload)`（并同时挂载到 `Symbol.for("@logix/sandbox/bridge")`），将 payload 写入 `TRACE(kind:"spy")`，可供未来的 Universal Spy 或自定义 SDK Hook 复用。  
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
