# 1.6 解析失败（Resolution Errors）

在 strict-by-default 的依赖解析语义下，**缺失提供者必须稳定失败**，并在 dev/test 环境给出“可读 + 可修复”的诊断信息（而不是静默回退到某个全局注册表）。

当前最小错误集合：

- `MissingModuleRuntimeError`：Logic 侧解析 `ModuleTag` 失败（典型来源：`$.use(Child)` 但未在同一实例 scope 提供 imports）。
- `MissingImportedModuleError`：React 侧从 imports-scope 解析子模块失败（`useImportedModule(parent, Child.tag)` / `host.imports.get(Child.tag)`）。

dev/test 下，错误对象（或错误文本）至少包含这些字段：

- `tokenId`：请求的 token 标识（通常是 `module.id`）。
- `entrypoint`：发生位置（例如 `logic.$.use` / `react.useImportedModule/imports.get`）。
- `mode`：本次解析的语义模式（当前 imports-scope 场景统一为 `strict`）。
- `startScope`：起点 scope（至少包含 `moduleId`/`instanceId`）。
- `fix[]`：可执行修复建议（至少两条）。

prod 下允许降级为短消息，但必须保持：

- `error.name` 稳定；
- 载荷 Slim（不包含 `Context`/`Effect`/闭包等大对象）。
