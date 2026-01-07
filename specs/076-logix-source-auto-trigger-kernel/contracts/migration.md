# Migration Notes（forward-only）

## 目标

- 将 source 自动触发从 Query/Form 的 watcher 胶水迁到内核；
- 保留 manual refresh 作为 escape hatch；
- 不提供兼容层（forward-only）。

## 迁移步骤（建议）

1. 更新 `StateTrait.source`：使用 `autoRefresh` policy 替代 `triggers/debounceMs`（按本 spec 的 public-api 契约）。
2. 内核落地 depsIndex + auto-trigger 后：
   - 删除 `packages/logix-query/src/internal/logics/auto-trigger.ts` 的默认挂载（或只保留手动 helper）。
   - 删除/收敛 `TraitLifecycle.makeSourceWiring` 的对外使用点。
3. 若业务需要更复杂的时序：
   - `autoRefresh: false`
   - 用 FlowProgram（075）显式触发 `traits.source.refresh(fieldPath)`（保持 tick 证据链）。

## 不提供兼容层

- forward-only：不保留旧 meta 字段的 shim；
- 迁移以类型检查与本目录 contracts 为准。

