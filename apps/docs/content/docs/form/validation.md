---
title: 校验与错误
description: validateOn / reValidateOn、rules、controller 默认动作与错误树约定。
---

## 1) 两阶段自动校验：`validateOn` / `reValidateOn`

Form 默认把自动校验拆成两个阶段：

- **提交前**：按 `validateOn` 决定是否在 `onChange/onBlur` 触发校验（默认只在提交时校验）
- **提交后**：按 `reValidateOn` 决定是否在 `onChange/onBlur` 触发增量校验（默认 `onChange`）

这样可以在“大表单/大列表”里避免“每次输入都做大量校验”，同时在用户第一次提交后提供更即时的反馈。

## 2) Rules：把 deps 当成契约

推荐把校验写在 `rules` 里（字段/列表/根规则）。`deps` 是“联动触发”的契约：只有显式声明了依赖，相关字段变化才会触发本规则的增量校验。

> `rules` 的 DSL（`const z = $.rules`）详见：[Rules DSL（z）](./rules)。

```ts
const $ = Form.from(Values)
const z = $.rules

const ProfileForm = Form.make("ProfileForm", {
  values: Values,
  initialValues: { name: "" },
  rules: z(
    z.field("name", {
      // deps 默认 []：仅在需要跨字段联动触发校验时再声明
      required: "必填",
      minLength: 2,
    }),
  ),
})
```

当规则需要读取同一对象内其他字段，并希望“其它字段变化也触发本字段校验”时，把 deps 写上（例如 `deps: ["preferredChannel"]`）。

### 2.1) `$self`：对象级 refine（跨字段错误不覆盖子树）

当你在对象级做跨字段校验时，推荐把错误写回 `errors.<path>.$self`（而不是覆盖 `errors.<path>` 整棵子树）：

```ts
rules: z(
  z.field(
    "profile.security",
    {
      deps: ["password", "confirmPassword"],
      validate: (security: any) =>
        security?.password === security?.confirmPassword ? undefined : "两次密码不一致",
    },
    { errorTarget: "$self" },
  ),
)
```

### 2.2) 列表校验：list/item 两个 scope

- 行级（item）：返回 `{ field: error }` 或 `{ $item: error }`，写回到 `errors.<list>.rows[i].*`
- 列表级（list）：返回 `{ $list: error }` 或 `{ rows: [...] }`，写回到 `errors.<list>.$list` / `errors.<list>.rows[i]`

## 3) `Form.Rule.*`：组织规则与复用

- `z.field/z.list/z.root`：推荐的声明式入口（类型随 values schema 收窄）
- `Form.Rule.make(...)`：低层归一化工具（把配置展开成可挂到 `check` 的规则集合）
- `Form.Rule.merge(...)`：低层合并工具（重复 ruleName 会稳定报错）
- 内置校验器：`required/minLength/maxLength/min/max/pattern`

## 4) controller 默认动作（组件外也能触发）

`useForm(formBlueprint)` 返回的 controller 在 React 与 Logic 中保持一致，你可以在组件外触发表单动作：

- `controller.validate()`：root validate（包含 Schema 写回）
- `controller.validatePaths(paths)`：按 valuePath 精确触发校验（字段或列表）
- `controller.setError(path, error)` / `controller.clearErrors(paths?)`：写入/清理手动错误
- `controller.reset(values?)`：重置 values/errors/ui/$form
- `controller.handleSubmit({ onValid, onInvalid? })`：提交流程（更新 submitCount、执行校验、根据错误数分流）

另外，如果你直接派发 `submit` 动作（或调用 `form.submit()`），它只会触发 Rules 的 root validate；Schema 校验只会在 `controller.validate()` / `controller.handleSubmit(...)` 中执行。

> 提示：当你的 UI 只想校验一小段路径（例如动态列表里某一行），优先用 `validatePaths`，避免把整棵表单都拉进一次校验事务。

## 5) traits：保留但作为高级入口

你仍然可以用 `traits` 表达更底层的 `StateTrait` 结构，但推荐把“常规校验”收敛到 `rules`，把 `traits` 留给：

- computed / link / source（派生、联动与异步资源）
- 极少量需要直接写底层 node/list 的高级能力（并配合性能/诊断对照）
