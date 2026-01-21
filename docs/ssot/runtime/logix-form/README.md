# @logixjs/form · Runtime 参考（Form 领域包）

> **Status**: Aligned (010-form-api-perf-boundaries)
> **Layer**: Domain package（thin adapter on logix-core）

`@logixjs/form` 的定位很明确：**Form 不是另一套引擎**，它只是把“表单”收敛成一个普通的 `Logix.Module`（并提供 controller + React hooks），从而与其他业务模块共享同一套 Runtime 的事务语义、调试/回放与可观测证据链。

## 0) 入口与导出（不使用 TypeScript namespace）

- `packages/logix-form/src/index.ts`：`Form.make`、`Form.traits/node/list`、`Form.Rule`、`Form.Error`、`Form.Trait`、`Form.Path`、`Form.Schema*`
- `packages/logix-form/src/react/index.ts`：`useForm` / `useField` / `useFieldArray` / `useFormState`

## 1) 核心模型（state / errors / ui / $form）

Form 的模块 state 是「values + 三棵辅助树」：

- **values**：`TValues` 直接平铺在 state root（由 `config.values` 决定）
- **errors**：统一错误树（规则/手动/Schema 三层；数组统一 `$list/rows[]` 口径）
- **ui**：交互态树（`ui.<valuePath>` 存 `{ touched, dirty }`；数组字段会形成 `ui.<listPath>[i]` 的行级子树）
- **$form**：表单元信息（`submitCount/isSubmitting/isDirty/errorCount`），其中 `errorCount` 用于 O(1) 推导 `isValid/canSubmit`

细节见 [01-domain-model.md](./01-domain-model.md)。

## 2) Blueprint 与 controller（默认动作）

`Form.make(id, config)` 返回一个 `Module`（领域定义对象）：

- `tag`：Form 的 `ModuleTag`（身份锚点）
- `impl`：可被 Root `imports` 引入的 `ModuleImpl`
- `controller`：通过 handle-extend 绑定到 `$.use(form)` / `useModule(form)` 返回值上的领域扩展（React/Logic 一致）

controller 默认动作：`validate` / `validatePaths` / `reset` / `setError` / `clearErrors` / `handleSubmit`。

## 3) wiring 与落点（实现在哪里）

- Form.make 主实现（Blueprint/ModuleImpl 装配）：`packages/logix-form/src/internal/form/impl.ts`
- reducer：`packages/logix-form/src/internal/form/reducer.ts`
- controller：`packages/logix-form/src/internal/form/controller.ts`
- 自动触发 wiring（debounce / onChange / onBlur / submit）：`packages/logix-form/src/internal/form/install.ts`
- Path 映射与数组 `rows` 口径：`packages/logix-form/src/Path.ts`
- React hooks：`packages/logix-form/src/react/*`

## 4) 性能边界（010 的核心心智）

在高频输入与动态列表场景下，Runtime 的增量派生/校验依赖“变更路径证据”（patchPaths / dirtySet）：

- Form 内置 reducers 通过 reducer 的 `sink(path)` 显式标注受影响路径，避免事务退化为 `dirty_all_fallback`。
- 业务自定义逻辑若需要高频写回，优先用 `$.state.mutate(...)` / `Form.Trait.*`（由 mutative 自动采集 patchPaths）；尽量避免 `$.state.update(...)` 这类“全量替换”写法。

## 5) 文档与示例（用户向 vs 工程向）

- 用户文档（产品视角）：`apps/docs/content/docs/form/*`
- 可运行示例：`examples/logix-react/src/demos/form/*`

## 6) 实现备忘（维护者向）

- Rules/Derived 的编译产物与 IR、以及 validate/writeback 链路：`./impl/README.md`
