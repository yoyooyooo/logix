# Migration Notes（forward-only）

> 本仓库采用 forward-only evolution：无兼容层/无弃用期。本文件记录破坏性变更与迁移口径。

## 1) `@logix/react`：从 per-module ExternalStore → RuntimeStore（单订阅点）

### 影响面

- 组件同时订阅多个模块时，语义升级为 **无 tearing**（同一 render 读取到的快照来自同一 tick）。
- 内部实现会调整 `packages/logix-react/src/internal/store/*` 与 `useSelector` 的订阅策略；对外 `useSelector` 用法不变。
- cutover 完成后会删除 per-module stores（`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts` / `ModuleRuntimeSelectorExternalStore.ts`），强制 “RuntimeStore topic facade = 唯一订阅真相源”。

### 迁移建议

- 若业务代码依赖了 `@logix/react` 的 internal 路径（例如直接 import `ModuleRuntimeExternalStore`），需要改为使用公开 API（`useSelector/useModule/useRuntime`），或在本特性落地后按新内部路径重构（不保证 internal 稳定）。
- 不提供 “先留一个 minor 版本的 deprecated shim” 过渡：forward-only，删即删；迁移以文档与类型检查为准。
- 对正常业务用法（`RuntimeProvider` + `useSelector/useModule`），本次迁移目标是 **完全透明**（无需改动调用点/Provider 形态）。若应用存在自研 React Adapter 或绕过 `RuntimeProvider/RuntimeContext` 的定制集成，需要人工介入调整。
- forward-only：不提供 100% 自动迁移脚本的承诺；若需要 codemod，只能作为辅助工具（以最终类型检查为准）。

## 2) 外部推送源接入：从手写胶水 → `StateTrait.externalStore`

### 旧写法（典型）

- `yield* $.on(service.changes).runFork((v) => $.state.mutate((d) => { d.inputs.x = v }))`
- 再用 `$.onState(...).runFork(() => $.traits.source.refresh(...))` 驱动下游 source/query

### 新写法（推荐）

- 把外部输入归一为 `ExternalStore<T>`（service/ref/stream sugar）
- 在 Module traits 中声明 `StateTrait.externalStore({ ... })`
- 下游依赖通过 `computed/source/link` 表达，减少胶水 watcher 与隐式时序

## 3) 黑盒跨模块 glue：保留，但不进入强一致承诺

若应用仍使用 `Process.link`/任意 Effect 黑盒进行跨模块联动：

- 允许继续存在（escape hatch）
- 但强一致（tick fixpoint + 无 tearing）只对 DeclarativeLinkIR 生效；黑盒逻辑仍可能产生跨 tick 的“中间态”
- 若存量业务隐式依赖黑盒在同 microtask 内同步生效（例如“立即可被 UI/下游模块读取”），该行为在本特性下不再保证，属于 breaking change：需要迁移到 DeclarativeLinkIR/模块内 computed/source，或用 `Runtime.batch(...)` 明确边界并接受 best-effort。

建议逐步迁移：把关键链路（如 Route → State → Query）收敛为 declarative 依赖 IR，以获得稳定化与可解释链路。

## 4) `Runtime.batch(...)`：同步边界，但不是事务

- `Runtime.batch` 无 rollback：callback 抛错也可能产生 partial commit（已写入的更新仍会 flush）。
- 不要用它实现“全有全无”；若业务需要原子性，请在 state 模型里做两阶段/补偿，或调整链路避免依赖该语义。
