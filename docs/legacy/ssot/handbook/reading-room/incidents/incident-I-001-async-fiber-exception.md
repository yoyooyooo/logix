# I-001 · React + Logix Runtime：AsyncFiberException（LLM 薄入口）

本文件只保留症状识别与最短修复路径；完整长链路记录见：`incident-I-001-async-fiber-exception.details.md`。

## 一句话判定

- 只要在“应当严格同步结束”的初始化链路里触发 `AsyncFiberException`，优先按本 incident 处理：把异步工作移出 `runSync` 路径（Logic setup / Layer 构造 / render 阶段）。

## 最短修复路径（按命中顺序排查）

1. Logic：是否把异步放进了 setup 段（或 setup 调了 run-only API）？把异步移到 run 段。
2. React：是否在 render 链路对可能含异步的 Effect/Layer 调了 `runtime.runSync(...)`？改为 Suspense/异步构建（或下沉到专用 Provider）。
3. Layer：是否在 Layer 构造阶段做 Worker/wasm/连接等异步初始化？把异步拆到 service 方法或 Logic run 段。

## 关键锚点（代码/文档）

- React hooks 与 cache：`packages/logix-react/src/internal/ModuleCache.ts`、`packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- Runtime 入口：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/**`
- React 集成 SSoT：`docs/ssot/runtime/logix-react/01-react-integration.md`
