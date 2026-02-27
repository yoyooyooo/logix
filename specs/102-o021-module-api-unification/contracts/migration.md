# Contract: Migration (O-021)

## Breaking Surface

- 统一入口为 `ModuleDef.build(...)` + `ModuleDef.createInstance(...)`，并提供 Layer-first 的 `ModuleDef.layer(config)`（等价 `build(config).createInstance().layer`）。
- `live/implement/impl` 不再是推荐写法，仅允许在 `writeback` 阶段用于迁移盘点与行为对照。
- 进入 `done` 门禁前必须移除 legacy 公开符号与 runtime fallback（见「移除里程碑」）。

## 移除里程碑（强制）

1. `writeback`（当前）:
   - 保留 legacy 读口，仅用于迁移过渡期与诊断盘点。
   - 每次 legacy 命中必须发出 `module_instantiation::legacy_entry`，并包含 `source`。
   - 新增代码与文档禁止继续推荐 legacy 写法。
2. `done`（收口门禁）:
   - 移除 `ModuleDef.implement(...)` 与 `Module.impl` 的公开可用面。
   - 移除 `Runtime.make(...)` 对 legacy `.impl` 的 fallback 解析分支。
   - 所有调用点必须迁移到 `build/createInstance`；旧写法应在类型检查或 lint 阶段直接失败。
3. `frozen`（冻结）:
   - 保持单入口，不再接受 legacy 回流。

## Migration Steps

1. 识别调用点：core/examples/react/sandbox。
2. 替换为 `build/createInstance` 或 `layer(config)` 并校验行为等价。
3. 清理旧术语文档与示例推荐写法。
4. 执行 codemod（批量把 `.implement({...}).impl` 迁为 `build(...).createInstance()`，或按 Layer-first 目标迁为 `layer(...)`）。
5. 开启 lint/CI 门禁阻止旧写法回流（`no-restricted-properties`/`no-restricted-syntax` 针对 `.implement` 与 `.impl`）。

## Non-Goals

- 不提供长期兼容层。
- 不设置跨阶段弃用期（以门禁切换代替）。
