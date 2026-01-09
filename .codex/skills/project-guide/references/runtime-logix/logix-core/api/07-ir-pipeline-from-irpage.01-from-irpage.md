# 1. 从 `IrPage` 出发：IR 是怎么进到页面里的

> 你在 `IrPage` 里看到的 JSON，99% 都来自 `@logixjs/core`；`@logixjs/sandbox` 负责把它“安全地跑起来并带回来”。

## 1.1 页面侧：把用户 Module 代码包成一个“试跑程序”

入口：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`

- `buildSandboxIrWrapper(...)` 会把你编辑器里的 `moduleCode` 拼接成一个 ESM 模块。
- wrapper 内部调用 `Logix.Observability.trialRunModule(__programModule, trialRunOptions)`。
- wrapper 的 `default export` 是一个 `Effect` 程序，它 `return` 一个对象：
  - `{ manifest, staticIr, trialRunReport, evidence }`
- 页面最终从 `SandboxClient.run()` 的 `stateSnapshot` 里读到这个对象，并按 key 渲染 Tabs。

> **关键点**：`IrPage` 不是“从 sandbox 拿 IR”，而是“在 sandbox 里运行一段代码，而这段代码调用了 `@logixjs/core` 的 IR 提取/试跑能力”。

## 1.2 Sandbox：Host → Worker → 执行结果回传

入口：

- Host client：`packages/logix-sandbox/src/client.ts`
- Worker：`packages/logix-sandbox/src/worker/sandbox.worker.ts`

链路简化为：

1. `createSandboxClient().init()`：创建 Worker，并把 `kernelUrl`（`@logixjs/core` bundle）与 `esbuild.wasm` 地址传给 Worker。
2. `compile(wrapper, filename, mockManifest?)`：Worker 内用 `esbuild-wasm` 打包 wrapper。
3. `run({ runId, useCompiledCode: true })`：Worker `import(blobUrl)` 执行 bundle，`Effect.runPromise` 跑 `default export`，把返回值作为 `stateSnapshot` 回传 Host。

## 1.3 Sandbox 编译器的约束（为什么它不只是 TS→JS）

入口：`packages/logix-sandbox/src/compiler.ts`

Sandbox 的 compile 做了三类关键约束（与 IR 解释链路强相关）：

- **固定 runtime 入口**：`import * as Logix from "@logixjs/core"` 会被外部化为 `kernelUrl`（例如 `/sandbox/logix-core.js`）。
- **固定 effect 依赖**：`effect/*` 会被外部化为 sandbox 提供的 `effect.js` 子路径，避免版本漂移。
- **严格子路径策略**：禁止 `@logixjs/core/internal/*`；对 `@logixjs/core/<subpath>` 必须匹配 kernel 的 `logix-core.manifest.json`（否则直接编译失败）。

这保证了“IR 提取”运行在受控的 runtime 实现上，且输入/输出可解释、可复现。
