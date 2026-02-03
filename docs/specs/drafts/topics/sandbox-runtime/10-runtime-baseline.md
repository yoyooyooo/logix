---
title: Sandbox Runtime Baseline (Web Worker)
status: merged
version: 2025-12-06
value: core
priority: next
moved_to: ../../../../ssot/runtime/logix-sandbox/10-runtime-baseline.md
---

## 1. 目标

> ✅ 已收编到 runtime SSoT：`docs/ssot/runtime/logix-sandbox/10-runtime-baseline.md`（后续修改以 SSoT 版本为准）。

建立「前端优先」的可运行基线：Web Worker 内可编译/运行 Logix/Effect 代码，主线程可观测日志/Trace/UI 意图，并具备超时熔断与 Kernel 预注入能力。

## 2. Host ↔ Worker 协议（建议对齐）

- Commands：  
  - INIT：`{ wasmUrl, kernelUrl }`（均为 **HTTP(S) 绝对 URL**）；  
  - COMPILE：`{ code, filename?, mockManifest? }`；  
  - RUN：`{ runId, actions?, useCompiledCode? }`；  
  - TERMINATE：无 payload。  
- Events：  
  - READY：`{ version, compilerReady }`；  
  - COMPILE_RESULT：`{ success, bundle?, errors? }`；  
  - LOG：`{ level, args[], source? }`；  
  - TRACE：`TraceSpan`（最小版执行 span）；  
  - ERROR：`{ code, message, stack? }`；  
  - COMPLETE：`{ runId, duration, stateSnapshot? }`；  
  - UI_INTENT（预留）：后续用于 UI/UX 意图回传。  
- 衔接文档：`platform/impl/code-runner-and-sandbox.md` 中已有初稿；需在 runtime SSoT 侧明确 TRACE / UI_INTENT 的公共 Schema（待后续 Intent 覆盖阶段解决）。

## 3. Worker 生命周期与 Watchdog

- 启动：Host 创建 Worker，发送 INIT，等待 READY。  
- 超时保护：Host 维护 5s（可配置）计时器，RUN 后若无响应则 `worker.terminate()` 并重建；不尝试软中断。  
- 复位：TERMINATE 触发清理；主线程 Hook 到 React/DevTools 时要避免内存泄漏。

## 4. Kernel 预加载与编译链路

- Kernel 产物：`effect` + `@logixjs/core` 预打包为单文件 ESM（例如 `/sandbox/logix-core.js`），由 `@logixjs/sandbox` 内部脚本在构建期生成。  
- Host 侧：通过 HTTP(S) 提供 `kernelUrl`，在浏览器中可直接被 `import()` 使用；测试环境可用 MSW 等方式在该 URL 上返回本地 Kernel bundle。  
- Worker 侧编译器：  
  - 使用 `esbuild-wasm` 的 stdin 模式编译用户代码；  
  - 通过插件拦截 `import "effect"` / `import "@logixjs/core"` 等，将其重写为 CDN / `kernelUrl`；  
  - 其他 bare import（非相对路径）默认重写为 CDN（例如 `https://esm.sh/...`），避免引入 Node-only 依赖。  
- 打包目标：  
  - ESM + inline sourcemap，便于调试；  
  - Bundle 在 Worker 内可通过 Blob URL + `import()` 动态加载执行。

### 4.1 参考实现：Vite + @logixjs/sandbox

- 在当前仓库中，`@logixjs/sandbox` 提供了 Vite 插件 `logixSandboxKernelPlugin` 作为 Host 侧的参考实现：  
  - dev 模式：从包内 `public/sandbox/logix-core.js` / `public/esbuild.wasm` 读取文件，通过 Vite dev server 中间件挂载到：  
    - Kernel：`/sandbox/logix-core.js`（即推荐的 `kernelUrl` 默认值）；  
    - esbuild：`/esbuild.wasm`（即推荐的 `wasmUrl` 默认值）。  
  - build 模式：在 `generateBundle` 阶段将上述两个文件以 asset 形式写入产物（同样路径）。  
- `SandboxClient` 在未显式传入 `kernelUrl` 时，会自动将默认值解析为 HTTP 绝对 URL（`window.location.origin + "/sandbox/logix-core.js"`），以适配 `blob:` 场景下的动态 `import()`。  
- 其他构建工具可以参考这一模式自行实现插件或静态资源拷贝脚本，只要最终满足：  
  - `kernelUrl` / `wasmUrl` 为浏览器可访问的 HTTP(S) 地址；  
  - 与 Worker 内的默认路径约定一致或通过 INIT 显式覆盖。
## 5. RuntimeEnv（Worker 内 Layer 组合）

- ConsoleProxy：拦截 console，发 LOG 事件。  
- Http Proxy/Mock：基础 fetch 拦截，配合 Mock Manifest 或 Proxy 转发（CORS 由 Host 侧代理）；  
- Tracer：注入 Effect Tracer，发 TRACE 事件；  
- 可选：State Diff 钩子（Logix Module 运行时）——可后续接入。
- UI Intent / Spy 桥接：Worker 暴露 `globalThis.logixSandboxBridge`（并同时挂载到 `Symbol.for("@logixjs/sandbox/bridge")`），其中 `emitUiIntent(packet)` 发 `UI_INTENT` 事件并同步打一条 `TRACE(kind:"ui-intent")`，`emitSpy(payload)` 以 `TRACE(kind:"spy")` 记录外部 SDK 调用或自定义观测；  
- Logix Debug Sink：若 Host 提供的 `kernelUrl` 可加载 `@logixjs/core`，Worker 会默认注入 DebugSink（来源 `logix`），`trace:*` 事件同时映射到 `TRACE(kind:"logix-debug")`，无需业务侧自行提供 Layer。

## 6. 最小可用目标（MVP Checklist）

- [ ] 协议与类型定义落地到 `@logixjs/sandbox`（client + worker）原型。  
- [ ] Kernel 预注入的构建脚本与加载逻辑跑通。  
- [ ] 简单示例：Logix Module/Effect 代码在 Worker 中运行，主线程收到 LOG/TRACE。  
- [ ] Watchdog 能终止死循环案例（while(true)）并自动重建。  
- [ ] 文档对齐：与 L4 草案 + v3 impl 文档一致，无重复/冲突表述。

## 7. 与后续阶段的接口

- Intent 覆盖：需要在 RUN/TRACE 中带上 Intent ID/Step ID；本阶段只预留字段即可。  
- 多运行时漏斗：协议保持通用，以便后续 Deno 逃生舱复用。  
- DevTools Session：保留 runId/traceId，后续在时间轴/对比视图中复用。
