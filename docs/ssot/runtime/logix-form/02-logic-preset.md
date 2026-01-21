# Form Wiring & Controller（当前实现语义）

> **Status**: Aligned (010-form-api-perf-boundaries)
> **Layer**: Form Core（@logixjs/form）

本文件记录 `@logixjs/form` 的“默认 wiring 与 controller 语义”，用于在改动/诊断时快速对齐：哪些触发在 logic 层做，哪些在 reducer/controller 层做。

## 1) wiring：install logic（UI 事件 → scopedValidate / source refresh）

实现落点：`packages/logix-form/src/internal/form/install.ts`

职责：

- `setValue/blur/submit/array*` → `TraitLifecycle.scopedValidate(...)`
- values 变更时刷新 source deps：`TraitLifecycle.makeSourceWiring(...)`
- 遵守 `validateOn/reValidateOn` 两阶段语义，并支持 `debounceMs`

触发摘要（按实现行为描述）：

- `blur(path)`：若当前阶段（submitCount=0/1+）或 rule 白名单要求 → `mode="blur"` scoped validate
- `setValue(path, value)`：总是 refresh source；若需要则按 debounce 触发 `mode="valueChange"` scoped validate
- `submit()`：总是 `mode="submit"` root validate（规则层）
- `array*`：视作 list 结构变更，必要时对 `Ref.list(listPath)` 触发 `mode="valueChange"` validate

## 2) controller：默认动作（React/Logic 一致）

实现落点：`packages/logix-form/src/internal/form/controller.ts`（`makeFormController`）

- `validate()`：manual root validate（规则）+ Schema decode 写回 `errors.$schema`
- `validatePaths(paths)`：对每个 path 做 manual scoped validate（field/list 分流）
- `handleSubmit(...)`：`submitAttempt` + `setSubmitting(true)` + submit validate + Schema decode + 以 `$form.errorCount` 决定 onValid/onInvalid + finally 复位 submitting
- `setError/clearErrors/reset`：只操作 manual 层（或全量 reset），并维护 `$form.errorCount`

## 3) 动态数组：为什么要同步 `ui.<listPath>` 与 `errors.<listPath>.rows`

实现落点：`packages/logix-form/src/internal/form/arrays.ts`（`syncAuxArrays`）

数组结构动作会导致 index 迁移，如果只更新 values，会出现“行错位”：上一行的 touched/dirty/错误显示到下一行。

因此 `arrayAppend/Prepend/Remove/Swap/Move` 会把同样的结构变换函数应用到：

- `ui.<listPath>`（行级 UI 子树数组）
- `errors.<listPath>.rows`（规则层行级错误）
- `errors.$manual.<listPath>.rows` / `errors.$schema.<listPath>.rows`（存在时才同步）

## 4) 性能边界：patchPaths（dirtySet）必须可证明

Form 的热点是“高频输入 + 大表单/大列表”。selector 只能减少 React 渲染，无法抵消 Runtime 的 converge/validate 成本。

实现落点：`packages/logix-form/src/internal/form/reducer.ts` reducers 的第三参 `sink(path)`：

- 内置 reducers 显式标注受影响路径，避免事务退化为 `dirty_all_fallback`
- 业务自定义逻辑若高频写回，优先 `$.state.mutate(...)` / `Form.Trait.*`（mutative 自动采集 patchPaths）
