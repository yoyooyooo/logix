# Contract: Errors（解析失败的可读可修复口径）

**Branch**: `008-hierarchical-injector`

## 1. 错误类型（最小集合）

系统至少应提供下列错误（可用同一 Error 类型 + 不同 name/fields 实现）：

- `MissingModuleRuntimeError`：strict 下解析某个 `ModuleTag` 失败（例如 `$.use(ModuleTag)`）
- `MissingImportedModuleError`：从 imports-scope 解析子模块失败（更偏 React 侧语义）
- `MissingRootProviderError`：`Root.resolve(Tag)` 在 root provider 中找不到对应提供者
- `AmbiguousModuleInstanceError`：存在多实例但解析入口无法确定目标

## 2. 必须包含的诊断字段

dev 环境下错误信息（或错误对象字段）必须包含：

- `tokenId`：请求的 token 标识（至少包含 moduleId 或 tag id）
- `entrypoint`：发生位置（Logic/React + API 名称）
- `mode`：strict/global（root provider 语义归为 global）
- `startScope`：起点 scope（父模块/父 runtime 的 moduleId/runtimeId/key 等）
- `fix[]`：至少两条可执行修复建议

并且 SHOULD（若可获得）包含：

- `rootScope`：root runtime 标识（至少区分不同 runtime tree；用于多 root 场景诊断）

prod 环境下可降级为短消息，但必须保持：

- 稳定的 `error.name`
- 不泄漏大对象与长字符串（避免性能/日志噪音）

## 3. Fix 建议的最低质量

错误的修复建议至少要覆盖两类动作：

1) **补齐提供者**：例如 “`Parent.implement({ imports: [Child.impl] })`” / “在 root layer 提供单例”。  
2) **选择正确语义**：例如 “如果想要单例（当前运行环境），使用 `useModule(Child.module)`；如果想要固定 root provider 的单例，使用 `Root.resolve(Child.module)`（React 侧通过 `runtime.run*` 执行）”；“如果想要多实例，透传 `ModuleRef`，不要按 Tag 猜”。
