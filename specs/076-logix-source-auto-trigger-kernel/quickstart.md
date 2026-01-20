# Quickstart（面向开发者）

目标：让业务/feature 包只声明 source 的绑定事实；默认自动触发由内核负责；复杂时序升级到 Workflow。

## 1) 默认：自动触发（onMount + depsChange）

- 只要声明 `StateTrait.source({ resource, deps, key })`，不再需要写 `$.onAction('setParams')...` 的 auto-trigger watcher。
- deps 变化后由内核触发 refresh；开启 debounce 时会自动合并。

## 2) manual-only：关闭自动触发

- 当你要完全自定义触发策略（例如 “onMount 后 delay 3s 再 refresh”），把 source 设为 manual-only：
  - `autoRefresh: false`
- 然后用 Workflow（075；权威输入 `WorkflowDef`，DX 入口 `Workflow`）表达自由时序，并通过 `callById('logix/kernel/sourceRefresh')` 显式触发 refresh（保证 tick 证据链与 `serviceId` 锚点；`call(KernelPorts.sourceRefresh)` 仅作为 TS sugar）。

## 3) 迁移提示（Query/Form）

- `@logixjs/query`：删除/收敛 `auto-trigger` 默认逻辑；把 cache-peek skip-loading 下沉到 refresh 实现。
- `@logixjs/form`：不再依赖 `TraitLifecycle.makeSourceWiring.refreshOnKeyChange` 的反射式解释入口。
