# @logix/form · 实现备忘录：Form API → Rules/Derived → IR → Runtime 链路

> **Status**: Draft (028-form-api-dx)
> **Audience**: Form 维护者 / 运行时实现者

本文件用“从业务写法回溯到底层”的方式，把 `@logix/form` 的关键封装层次、编译产物（最小 IR）以及运行时 validate/writeback 链路说清楚，避免出现“用户文档一套、实现又一套”的并行真相源。

---

## 0) 入口：业务侧到底写了什么

业务侧的主入口是：

- `Form.from(ValuesSchema)`：从 values schema 派生出三套 DSL（`derived/rules/traits`）。
- `Form.make(id, config)`：产出一个 **Form Module**（Blueprint），可直接交给 Runtime/React。

推荐心智（面向业务）：

- 日常只用 `derived + rules` 解决绝大多数表单需求；
- `traits` 保留为高级入口（computed/source/link 或少量底层能力对照）。

对应落点：

- DSL：`packages/form/src/dsl/from.ts`（组装 `derived/rules/traits`）
- Blueprint：`packages/form/src/form.impl.ts`（`Form.make` 主实现）

---

## 1) Rules DSL：两个 authoring 入口，一个最小 IR

`const z = $.rules` 同时承载两套写法：

### 1.1 Decl DSL（扁平 decl list）

```ts
rules: z(
  z.field("a.b", { required: "必填" }),
  z.list("items", { identity: { mode: "trackBy", trackBy: "id" }, item: { validate: (row) => ... } }),
  z.root({ validate: (values) => ... }),
)
```

- 产物：`RulesSpec`（`_tag: "FormRulesSpec"` + `decls: RulesDecl[]`）
- decl 类型：`packages/form/src/rule.ts`（`FieldDecl/RootDecl/ListDecl`）

### 1.2 Node DSL（zod-like 结构化 authoring）

```ts
const rules = z.schema(
  z.object({
    contact: z.object({ email: z.field({ required: "必填" }) }).refine({ validate: (obj) => ... }),
    items: z.array(z.object({ id: z.field({}), name: z.field({}) }), { identity: { mode: "trackBy", trackBy: "id" } }),
  }),
)
```

- Node：`RulesNode`（`RulesFieldNode/RulesObjectNode/RulesArrayNode`）
- 编译：`compileSchema(...)` 把 node tree **降解为等价 decl list**（仍然回到 `RulesSpec.decls`）

对应落点：`packages/form/src/dsl/rules.ts`

> 关键裁决：`RulesSpec.decls` 是 rules 的 **最小 IR**（最少嵌套、易 diff、易序列化、易做诊断清单）。Node DSL 只是 authoring 语法糖，最终必须回到同一份 decl list。

---

## 2) Canonical Path：约束与类型收窄

Form 的 valuePath 约束是“点分段”：

- ✅ `a.b.c`
- ✅ `$root`（仅 root scope）
- ❌ `a[0].b` / `a[].b` / `a.0.b`（禁止 bracket 与纯数字 segment）

类型侧，为了让 DX 到位（路径/trackBy/deps/validate 入参可推导），引入了一套“穿透数组项”的 canonical 类型：

- `CanonicalPath<T>` / `CanonicalValue<T, P>`
- `CanonicalListPath<T>` / `CanonicalListItem<T, P>`

对应落点：`packages/form/src/types.ts`

---

## 3) 编译：RulesSpec → StateTraitSpec（不引入第二套运行时）

核心目标：把 rules **编译为等价的 `@logix/core` StateTraitSpec**，让校验完全复用 runtime 的依赖图/增量 validate/诊断链路。

编译入口：`packages/form/src/internal/form/rules.ts`（`compileRulesToTraitSpec`）

### 3.1 field decl → StateTrait check entry

- `Rule.make(ruleInput)` 把 RHF-like 声明展开成“具名规则集合”
- 产物是 `StateTraitEntry(kind="check")`，并通过 `meta.writeback` 写回 errors

`errorTarget: "$self"` 的处理：

- 依赖前缀：把相对 deps 前缀到对象路径（避免业务手写全路径）
- 写回路径：`errors.<valuePath>.$self`（避免覆盖整个子树）

### 3.2 root decl → `$root` check entry

- 编译到 `spec.$root`（`fieldPath: "$root"`）
- 默认写回到 `errors.$root`（由 logix-core 的 writeback 规则决定）

### 3.3 list decl → StateTrait list entry

- 编译到 `StateTrait.list({ identityHint, item, list })`
- `identityHint.trackBy` 只用于 runtime 生成稳定 rowId（并参与诊断解释与降级）

---

## 4) 运行时：validate/写回/数组 rows 口径

### 4.1 validate 触发（wiring）

Form 的默认 wiring 把 UI 事件映射为“按 scope 增量 validate”：

- 入口：`packages/form/src/logics/install.ts`
- 语义：两阶段 gate（`validateOn/reValidateOn`）+ `debounceMs`

更完整的触发口径见：`../02-logic-preset.md`

### 4.2 errors 写回（logix-core）

最终写回发生在 logix-core 的 StateTrait validate：

- `packages/logix-core/src/internal/state-trait/validate.ts`
- check 规则的写回路径：`meta.writeback.path ?? "errors.<scopeFieldPath>"`
  - 因此 `$root` scope 默认落到 `errors.$root`
  - `errorTarget: "$self"` 会落到 `errors.<path>.$self`

### 4.3 数组错误树的 rows 映射

数组字段的 errors 统一走 `$list/rows[]` 口径：

- values：`items.0.name`
- errors：`errors.items.rows.0.name`

路径映射工具：`packages/form/src/path.ts`

同时，runtime validate 会在行级错误对象上写入 `$rowId`，用于 identity/诊断/对齐（避免重排后“错误跟错行”）。

---

## 5) Rules 的 Static IR：RulesManifest（用于解释与对照）

为了让“规则是什么/依赖什么/在哪个 scope/采用什么 identity”可解释且可序列化，Form 提供了 RulesManifest：

- 构建：`packages/form/src/internal/form/rules.ts`（`buildRulesManifest`）
- 形状：
  - `lists`: `{ path: string[]; identity: ListIdentityPolicy }[]`
  - `rules`: `{ ruleId; scope; deps; validateOn?; meta? }[]`

对外暴露点（Form handle extension）：

- `form.rulesManifest()`
- `form.rulesManifestWarnings()`

对应落点：`packages/form/src/form.impl.ts`

> 关系说明：RulesManifest 是 form 层的“规则清单 IR”；真正的执行计划、依赖图与动态 trace 仍由 logix-core 的 trait graph/validate 产出（DebugSink/DevtoolsHub）。两者应保持“同源可对照”，避免出现第二份不可回放的解释链路。
