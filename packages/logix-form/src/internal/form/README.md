# `packages/form/src/internal/form/*`

本目录用于承载 `@logix/form` 的 **Form Runtime 实现内核**（热路径 + 可维护性拆分），目标是让 `packages/form/src/Form.ts` 只做 public API 的组合与导出，而把高频变更点按职责归位到独立模块。

## 模块职责

- `errors.ts`
  - `errorCount` 的增量计数与写回（用于 `FormView` 的 O(1) 可提交判定）。
  - 约束：只在 reducer 的 “写回 errors 树” 边界做计数，不在 UI/selector 层扫描。

- `arrays.ts`
  - list/array 操作相关的 aux 对齐（`ui`、`errors.*.rows`）与 `isAuxRootPath` 判定。
  - 约束：事务内纯同步；避免在 reducer 外散落 “对齐逻辑”。

- `reducer.ts`
  - 表单 Action → State 的纯函数 reducer（`setValue/blur/reset/setError/clearErrors/array*`）。
  - 约束：只做状态变更与最小 dirty 标记；不执行 validate/Schema 解码等逻辑。

- `controller.ts`
  - 默认控制器动作（`validate/validatePaths/reset/setError/clearErrors/handleSubmit`）的 Effect 编排。
  - 约束：只负责 orchestration（触发 scopedValidate、写回 schema errors、提交回调），不做状态计算。

- `traits.ts`
  - `derived/rules/traits` 的 normalize 与合并（包含 `validateOn/reValidateOn` gate）。
  - 约束：合并冲突必须稳定失败并给出可行动错误信息，避免语义漂移。

- `rules.ts`
  - `rules` 的编译（decl list → `StateTraitSpec`）与 `RulesManifest`（Static IR）的构建与类型定义。
  - 约束：产物必须可序列化；默认不产生额外 trace/分配，仅在显式调用 `rulesManifest()` 时计算。

## 入口与组合

- `packages/form/src/form.impl.ts`：当前 public API 的实现入口（逐步继续拆分）。
- `packages/form/src/form.ts`：纯组合/导出层（`export * from "./form.impl.js"`）。
