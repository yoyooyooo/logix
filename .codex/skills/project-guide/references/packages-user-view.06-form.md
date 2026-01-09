# 6) `@logixjs/form`（Feature Kit：表单 = values/errors/ui/$form）

## 你在什么情况下会用它

- 需要可订阅/可回放/可组合的表单状态（而不是组件局部 state）。
- 需要统一的错误树口径、列表行稳定标识（避免数组重排错位）。

## 核心概念（推荐默认入口）

- `Form.make(id, { values, initialValues, rules, derived, ... })`
- `rules`：表达校验（field/list/root），编译为等价 TraitSpec（不引入第二套运行时）。
- `derived`：表达联动/派生（computed/link/source），默认只写 values/ui。
- controller：通过 handle 扩展暴露默认动作（React/Logic 一致），如 `handleSubmit/validate/reset/...`。

## React 最小用法（推荐）

- `useForm(FormModule)`：得到带 `controller` 的 ModuleRef（由 `@logixjs/react` handle-extend 机制提供）
- `useField(form, path)` / `useFieldArray(form, listPath)` / `useFormState(form, selector)`

## 文档与示例入口

- 文档主线：`apps/docs/content/docs/form/*`（从 `quick-start.md` 开始）
- 真实例子：`examples/logix-react/src/demos/form/*`、`examples/logix-react/src/demos/complex-form/*`
- 实现备忘（维护者向）：`.codex/skills/project-guide/references/runtime-logix/logix-form/impl/README.md`
