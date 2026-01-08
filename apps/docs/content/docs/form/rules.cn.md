---
title: Rules DSL（z）
description: $.rules 的两种写法：Decl DSL（field/list/root）与 Node DSL（schema + object/array）。
---

`rules` 是表单校验的推荐入口。统一先从 values Schema 派生出 `z`：

```ts
const $ = Form.from(ValuesSchema)
const z = $.rules
```

你只需要记住一条：`Form.make({ rules })` 里的 `rules` 必须是 **RulesSpec**（也就是 `z(...)` 或 `z.schema(...)` 的返回值）。`z.field/z.list/z.root` 产出的是“decl”（声明），不能直接传给 `Form.make`。

## 1) Decl DSL：`rules: z(z.field / z.list / z.root)`

Decl DSL 适合“把规则挂在某几个明确路径上”，类型会随 values Schema 收窄（路径、deps、validate 入参都会提示）。

### 1.1 字段：`z.field(valuePath, rule)`

```ts
rules: z(
  z.field("contact.email", { required: "邮箱必填" }),
  z.field("contact.phone", {
    deps: ["preferredChannel"],
    validate: (phone, ctx) => {
      const state = (ctx as any).state as any
      if (state.contact?.preferredChannel !== "phone") return undefined
      return String(phone ?? "").trim() ? undefined : "当首选渠道为电话时，请填写手机号"
    },
  }),
)
```

当你在对象级做跨字段校验，并希望错误写回到 `errors.<path>.$self`，可以用 `errorTarget: "$self"`：

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

### 1.2 动态列表：`z.list(listPath, { identity, item, list })`

```ts
rules: z(
  z.list("items", {
    identity: { mode: "trackBy", trackBy: "id" },
    item: {
      deps: ["name", "quantity", "price"],
      validate: (row) => {
        const errors: Record<string, unknown> = {}
        if (!String((row as any)?.name ?? "").trim()) errors.name = "名称必填"
        if (!((row as any)?.quantity > 0)) errors.quantity = "数量需 > 0"
        if (!((row as any)?.price >= 0)) errors.price = "价格需 ≥ 0"
        return Object.keys(errors).length ? errors : undefined
      },
    },
    list: {
      validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: "至少一行" }),
    },
  }),
)
```

- `item`：行级校验（只看当前行） → 写回 `errors.<list>.rows[i].* / .$item`
- `list`：列表级/跨行校验（一次扫描 rows） → 写回 `errors.<list>.$list / .rows[i]`

### 1.3 根规则：`z.root(rule)`

当你需要“看整棵 values”做校验时，用 `z.root(...)`：

```ts
rules: z(
  z.root({
    validate: (values) => (values ? undefined : "表单整体不合法"),
  }),
)
```

> 提示：根规则通常用于“全局一致性约束/提交前兜底”。更细粒度的联动触发，优先落在字段/列表规则并显式声明 `deps`。

### 1.4 组合规则（推荐约定）

`z(...)` 的入参既支持单条 decl，也支持 decl 数组（会做一层 flatten）。为了避免“写法自由度过高导致混乱”，建议在团队里约定：

- 业务侧尽量只出现一种形态：`rules: z(...)`（Decl DSL），不要把 `z(...)` 和 `z.schema(...)` 混在同一个 rules 里。
- 当需要拆分复用时，让“规则片段函数”统一返回 **decl 数组**，最后只在一个地方 `z(partA, partB, ...)` 合并。
- 同一路径不要重复声明（会稳定报错）；需要“叠加校验”时，把多个校验合并到同一个 ruleInput 的 `validate` 里。

## 2) Node DSL：`z.object / z.array / z.field(...)` + `z.schema(node)`

Node DSL 更像 zod：你用 `z.object/z.array` 描述“嵌套结构”，最后用 `z.schema(...)` 一次性编译成 `rules`。

### 2.1 `z.at(prefix)`：在某个 prefix 下写 Node DSL

当前 `examples/` 里还没有 `z.at(...)` 的示例，但它在 Node DSL 里很好用：避免重复写长 prefix。

```ts
const zc = z.at("contact")

const rules = zc.schema(
  zc.object({
    email: zc.field({ required: "邮箱必填" }),
    phone: zc.field({}),
  }),
)
```

> 对 Decl DSL 来说，`z.at(...)` 需要你传“相对路径”（如 `"email"`），但目前 TS 类型不会把 `"email"` 约束成相对路径集合；如果你想保留强类型路径提示，建议直接用 `z.field("contact.email", ...)` 这种全路径写法。

```ts
const rules = z.schema(
  z.object({
    contact: z.object({
      email: z.field({ required: "邮箱必填" }),
      preferredChannel: z.field({}),
      phone: z.field({
        deps: ["preferredChannel"],
        validate: (phone, ctx) => {
          const state = (ctx as any).state as any
          if (state.contact?.preferredChannel !== "phone") return undefined
          return String(phone ?? "").trim() ? undefined : "当首选渠道为电话时，请填写手机号"
        },
      }),
    }),
    items: z
      .array(
        z.object({
          id: z.field({}),
          name: z.field({ required: "必填" }),
          quantity: z.field({ min: { min: 1, message: "数量必须 > 0" } }),
        }),
        { identity: { mode: "trackBy", trackBy: "id" } },
      )
      .refine({
        validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: "至少一行" }),
      }),
  }),
)

Form.make("MyForm", { values: ValuesSchema, initialValues, rules })
```

## 3) 一致性建议：同一表单尽量只选一种 DSL

- **Decl DSL**：适合“按路径点挂规则”，类型提示更直接。
- **Node DSL**：适合“整体结构化描述”，再通过 `z.schema` 编译。
- `Form.Rule.make/merge` 是更低层的组织/复用工具；只有在需要复用/组合时再引入，避免和 `z.*` 混用增加心智负担。

## 4) CanonicalPath vs ValuePath：为什么 rules 里不允许数字段

- **UI/读写具体行**：用 valuePath（运行时字符串），允许写 `items.0.name`（`useField(form, "items.0.name")` / `setValue({ path: "items.0.name" })`）。
- **rules/依赖图（deps）**：用 canonical path（类型约束），禁止数字段；数组会“穿透数组项”，例如：
  - `items.name` 表示“任意行的 name”（等价语义：`items.${number}.name`）
  - `items.allocations.amount` 表示“任意行的 allocations 任意项的 amount”
- **行级/跨行校验**：不要写 `z.field("items.name", ...)`；用 `z.list("items", { item/list })` 表达数组语义，`item.deps` 用相对字段（如 `"name"`），`list.validate(rows)` 拿到整段 rows 一次性扫描。
- **为什么要这样设计**：
  - 数组 index 会随插入/删除/重排漂移，`deps: ["items.0.name"]` 这类语义无法稳定（很容易“依赖错行”）。
  - `deps` 的职责是表达“结构字段的触发契约”，而“某一行是谁”属于运行期 identity（`trackBy/rowId`）——两者必须分层，否则难以回放/解释。
  - 依赖图只按 schema 形状增长，避免按 rows 数量膨胀，守住增量校验的性能边界。
