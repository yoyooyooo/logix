# Code Runner & Sandbox 策略

> **Status**: Living (Implementation Planning)
> **Scope**: 平台如何运行和调试用户的 Effect-TS 代码。

## 1. 核心决策：Frontend First

针对“如何运行用户代码”这一问题，当前主线明确选择 **前端方案 (Browser / WebWorker)** 作为首选运行时，而非后端沙箱 (Node/Docker)。

### 1.1 决策依据

| 维度 | 前端方案 (Web Worker) | 后端方案 (Node Sandbox) |
| :--- | :--- | :--- |
| **响应速度** | ⚡️ **零延迟** (本地内存) | 🐢 **高延迟** (网络 + 容器启动) |
| **资源成本** | 💰 **免费** (用户算力) | 💸 **昂贵** (服务器算力) |
| **Mock 体验** | **丝滑** (直接注入 JS 对象) | **繁琐** (需 RPC/序列化) |
| **架构验证** | ✅ **强迫解耦** (Platform Agnostic) | ⚠️ **容易耦合** (依赖 fs/net) |

### 1.2 哲学意义

选择前端运行时不仅是成本考量，更是对 **Effect-Native** 架构的终极验收：
如果业务逻辑 (Module Logic) 无法在浏览器中配合 Mock Layer 运行，说明它**耦合了不该耦合的基础设施**，违背了依赖倒置原则。

## 2. 实现架构

### 2.1 运行时容器：Web Worker

为了防止用户代码死循环卡死 UI 线程，必须在 Web Worker 中运行逻辑。

#### 2.1.1 编译器选型：esbuild-wasm

在 `esbuild-wasm` 与 `swc-wasm` 之间，当前主线选择 **`esbuild-wasm`**。

*   **理由**：
    1.  **Bundling 能力**：我们需要模拟多文件模块环境（Module Resolution），`esbuild` 的 Bundling 算法成熟且稳健，而 `swc` 的 bundler (`swcpack`) 尚处于实验阶段。
    2.  **Plugin API**：`esbuild` 提供了强大的 `onResolve` / `onLoad` 钩子，允许我们在浏览器端轻松实现 **Virtual File System**（从内存读取 TS 文件内容），这是 Playground 的核心需求。
    3.  **生态兼容**：Effect-TS 官方 Playground 及大多数在线 IDE (StackBlitz 等) 均采用 esbuild 方案，坑少路平。
*   **代价**：
    *   WASM 包体积较大 (~8MB)，需配置 HTTP Cache 和 Lazy Load 策略优化首屏体验。

```mermaid
graph TD
    Main[Main Thread (UI)] <-->|postMessage| Worker[Web Worker (Runtime)]

    subgraph Worker
        Compiler[esbuild-wasm] -->|Bundle (Virtual FS)| UserCode[User Effect]
        MockLayer[Mock Environment] -->|Provide| UserCode
        UserCode -->|Run| Result
    end
```

### 2.2 依赖注入 (DI) 与 Mock

利用 Effect 的 Layer 系统，我们可以轻松替换所有副作用服务：

```typescript
// 真实环境 (Node/Server)
const LiveEnv = Layer.mergeAll(
  PostgresDB.Live,
  RedisCache.Live,
  StripePayment.Live
);

// 平台运行时 (Browser Worker)
const PlaygroundEnv = Layer.mergeAll(
  // 使用内存数据库模拟
  InMemoryDB.Live,
  // 使用控制台日志
  ConsoleLogger.Live,
  // 使用模拟支付服务 (总是成功或随机失败)
  MockPayment.Live
);

// 运行
userEffect.pipe(Effect.provide(PlaygroundEnv));
```

### 2.3 交互协议

Worker 与主线程通过结构化消息通信：

*   **Log**: Worker 捕获 `ConsoleLogger` 的输出 -> 发送给主线程 -> 控制台展示。
*   **Trace**: Worker 收集 `Effect.Tracer` 数据 -> 发送给主线程 -> 瀑布图展示。
*   **Hot Update**: 主线程修改 Mock 数据 (如 "模拟网络超时") -> 发送给 Worker -> Worker 重置 Env 并重跑。

## 3. 局限性与边界 (Limitations)

虽然前端方案优势巨大，但在 `logix` + `effect-ts` 体系下有以下具体局限：

### 3.1 严禁引用 `@effect/platform-node`
这是最常见的错误来源。
*   **问题**：若业务代码 import 了 `@effect/platform-node`，Bundler 会试图打包 Node.js 的 `fs`/`net` 模块，导致构建失败。
*   **约束**：Module/Link 层代码 **只能依赖 `@effect/platform` (纯接口)**。
*   **治理**：平台应配置 ESLint 规则，禁止在业务逻辑目录引入 `-node` 结尾的包。

### 3.2 HttpClient 的 CORS 限制
*   **问题**：浏览器环境受同源策略限制。若用户尝试在 Playground 中通过 `HttpClient` 调用真实的外部 API（而非 Mock），且该 API 未配置 CORS Headers，请求会失败。
*   **对策**：
    1.  **推荐 Mock**：Playground 核心场景应基于 `MockLayer`。
    2.  **代理转发**：若必须调用真实接口，需在平台侧提供 CORS Proxy 服务。

### 3.3 同步阻塞 (CPU Bound)
*   **问题**：Effect 虽擅长异步，但若包含大量同步计算（如 `while(true)` 死循环），会阻塞 Worker 的 Event Loop，导致无法响应 `postMessage`（包括停止指令）。
*   **对策**：平台必须具备 **"Terminate & Restart Worker"** 的硬重置能力，而不能仅依赖软性的 `Fiber.interrupt`。

### 3.4 密钥安全
*   **问题**：浏览器环境不能存储真实 API Key。
*   **对策**：Playground 环境一律使用 Mock Service，不发起真实 HTTP 请求。

## 4. 总结

平台通过 **Web Worker + Effect Layer** 实现了一个零成本、毫秒级响应的 **全双工代码演练场**。这既提升了 DX，又倒逼了架构的纯洁性。
