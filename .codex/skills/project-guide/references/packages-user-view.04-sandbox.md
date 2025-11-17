# 4) `@logix/sandbox`（Sandbox / Worker 运行时 + Vite 插件）

## 你在什么情况下会用它

- 想在浏览器 Worker 中运行 Logix/Effect 程序，并采集 traces/logs/ui-intents。
- 想把它作为 Playground / Alignment Lab 的“可解释执行底座”。

## 最小用法（两条路）

- **纯 TS/JS 客户端**：`new SandboxClient()` → `init()` → `compile()` → `run()`（入口：`packages/logix-sandbox/src/Client.ts`）
- **Effect/Layer 注入**：`SandboxClientLayer()` 提供 `SandboxClientTag`，在 Logic 中 `yield* $.use(SandboxClientTag)`（入口：`packages/logix-sandbox/src/Service.ts`）

## Vite 集成

- `@logix/sandbox/vite`：`logixSandboxKernelPlugin(...)`（入口：`packages/logix-sandbox/src/Vite.ts`）
- 真实示例：`examples/logix-sandbox-mvp/vite.config.ts`

## 真实示例

- `examples/logix-sandbox-mvp/*`（从 `RuntimeProvider.tsx` + `modules/SandboxLogic.ts` 开始读）
