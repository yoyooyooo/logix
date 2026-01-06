# Module 生命周期与 Scope（LLM 薄入口）

本文件是实现备忘录（impl），只保留导航；细节分拆到同目录分节文档中，按需加载。

## 边界与外链（避免重复叙述）

- 生命周期/Scope 的语义口径（SSoT）：`../runtime/05-runtime-implementation.03-scope-disposal.md`、`../concepts/10-runtime-glossary.08-scope-resolution.md`
- Devtools/诊断事件口径：`../observability/09-debugging.md`
- 本目录仅补充实现落点、风险点与排查抓手；若发现与 SSoT 不一致，优先修 SSoT，再修 impl

## 最短链路

- 我在排查 StrictMode / 局部模块泄漏：读 `03-module-lifecycle-and-scope.04-react-strict-mode.md` → `03-module-lifecycle-and-scope.06-local-moduleimpl-usemodule.md`
- 我在理解全局模块（AppRuntime）生命周期：读 `03-module-lifecycle-and-scope.05-global-module-appruntime.md`

## 分节索引

- `03-module-lifecycle-and-scope.01-lifecycle-config.md`
- `03-module-lifecycle-and-scope.02-module-runner.md`
- `03-module-lifecycle-and-scope.03-status-pattern.md`
- `03-module-lifecycle-and-scope.04-react-strict-mode.md`
- `03-module-lifecycle-and-scope.05-global-module-appruntime.md`
- `03-module-lifecycle-and-scope.06-local-moduleimpl-usemodule.md`
- `03-module-lifecycle-and-scope.07-summary.md`
