# Logix Runtime · 参考索引（for logix-llms）

本文件作为 `logix-llms` skill 的补充索引，用于在需要更细粒度上下文时快速定位本仓已有文档与代码。

> 原则：仍以 `docs/specs/runtime-logix` 与 `docs/specs/intent-driven-ai-coding/v3` 为事实源，本文件只做路径速查，不重复长篇内容。

## 1. Runtime Logix 文档分组

- 顶层总览
  - `docs/specs/runtime-logix/README.md`
  - `docs/specs/intent-driven-ai-coding/v3/97-effect-runtime-and-flow-execution.md`
- Core（实现者与运行时维护者）
  - `docs/specs/runtime-logix/core/README.md`
  - `docs/specs/runtime-logix/core/01-architecture.md`
  - `docs/specs/runtime-logix/core/02-module-and-logic-api.md`
  - `docs/specs/runtime-logix/core/03-logic-and-flow.md`
  - `docs/specs/runtime-logix/core/04-logic-middleware.md`
  - `docs/specs/runtime-logix/core/05-runtime-implementation.md`
  - `docs/specs/runtime-logix/core/06-platform-integration.md`
  - `docs/specs/runtime-logix/core/07-react-integration.md`
  - `docs/specs/runtime-logix/core/08-usage-guidelines.md`
  - `docs/specs/runtime-logix/core/09-debugging.md`
- React / Form 适配层
  - `docs/specs/runtime-logix/react/README.md`
  - `docs/specs/runtime-logix/form/README.md`（如存在）
- 实现结构与包关系
  - `docs/specs/runtime-logix/impl/package-structure.md`
  - `docs/specs/runtime-logix/impl/README.md`

## 2. 关键包入口（@logix/*）

在需要查看完整 d.ts 或内部实现时，优先打开以下入口文件：

- `packages/logix-core/src/index.ts` · Barrel，导出 Runtime 核心 API；
- `packages/logix-core/src/Module.ts` · Module/ModuleImpl/Shape/Reducer 等；
- `packages/logix-core/src/Logic.ts` · Logic Env/Of、Bound API 内核入口；
- `packages/logix-core/src/Flow.ts` · Flow 编排 API；
- `packages/logix-core/src/Runtime.ts` · `Runtime.make` 与 AppRuntime；
- `packages/logix-core/src/Debug.ts` · DebugSink / DebugLayer / 事件结构；
- `packages/logix-react/src/index.ts` · React 适配层组件与 Hooks；
- `packages/logix-sandbox/src/index.ts` / `src/client.ts` · SandboxClient 与协议；
- `packages/logix-devtools-react/src/index.tsx` / `src/snapshot.ts` · Devtools UI 与 Snapshot。

## 3. 示例速查

当需要为 LLM 提供「可以直接照抄再改」的模式时，可优先参考：

- 运行时 + Fluent DSL：
  - `examples/logix/src/scenarios/fluent-intent-basic.ts`
  - `examples/logix/src/scenarios/optimistic-toggle.ts`
  - `examples/logix/src/scenarios/file-import-flow.ts`
- React 集成：
  - `examples/logix-react/src/modules/counter.ts`
  - `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
  - `examples/logix-react/src/demos/*`（Local/Session/Fractal/Suspense 等）
- Sandbox / Playground：
  - `examples/logix-sandbox-mvp/src/RuntimeProvider.tsx`
  - `examples/logix-sandbox-mvp/src/modules/*`

后续如发现某类模式在多个仓库中复用（例如长任务 Flow、表单脏标记、RegionSelector 等），可在此处补充一个「模式名称 → 示例文件路径」的速查表，减少 LLM 在代码树中的盲扫成本。
