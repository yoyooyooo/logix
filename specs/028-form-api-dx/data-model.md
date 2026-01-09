# Data Model: Form API 收敛与 DX 提升（rules-first）

> 本文定义 028 的“推荐表单定义入口 / 规则声明 / 列表 identity / 错误树 / 诊断事实源”的最小数据模型，用于指导实现拆分与 contracts 对齐。

## 0) 关键边界

- **推荐路径**：`values/initialValues`（值树） + `derived`（派生/联动） + `rules`（校验）。（顶层概念 ≤ 4，满足 SC-002）  
- **高级入口**：`traits`（直接注入底层 `StateTraitSpec`），用于 escape hatch；不作为默认文档路径。  
- **不引入第二套运行时**：`rules/derived/traits` 必须可 100% 降解为 kernel `StateTraitSpec`，并通过 `@logixjs/core` 执行与产出 trace（Static IR + Dynamic Trace）。  
- **事务边界**：规则/派生在同步事务窗口内执行；禁止 IO/await。

## 1) 路径模型：ValuePath vs FieldPath（索引语义分层）

Form 内存在两类“路径”：

1) **ValuePath（带索引）**：面向 UI/交互与数组操作，允许写 `items.0.name` / `items[0].name` / `items[].name`。  
2) **FieldPath（无索引）**：面向 trait/依赖推导/诊断锚点，必须是“去索引”的 canonical segments（对齐 Spec 009）。

当前实现落点（事实依据）：

- `packages/logix-form/src/path.ts`：提供 `toFieldPath(path)`，会移除 `[]` 与纯数字段；空路径会返回 `["$root"]`。  
- `specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json`：FieldPath segments 禁止 `[]`/`[0]`/纯数字段，且最短 1 段。

结论：

- `useField/useFieldArray` 可以继续用 ValuePath（string）表达具体 index；  
- trait/规则锚点（scope）与诊断契约必须使用 FieldPath（segments array）。

## 2) Form.make（推荐入口）配置形态（概念模型）

目标形态（概念模型；实现以本仓类型为准）：

```ts
// schema-scope：统一类型收窄入口（对齐 Logix.StateTrait.from）
const $ = Form.from(ValuesSchema)

type FormMakeConfigV2<TValues extends object> = {
  values: Schema.Schema<TValues, any>
  initialValues: TValues
  validateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
  reValidateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
  debounceMs?: number

  // 推荐：只声明联动/派生（默认只允许写 values/ui）
  derived?: DerivedSpec

  // 推荐：只声明校验（字段规则 + 动态列表规则）
  rules?: FormRulesSpec<TValues>

  // 高级：直接注入底层 StateTraitSpec（escape hatch）
  traits?: StateTraitSpec<TValues>
}
```

约束（对齐 FR/NFR）：

- `derived` 默认禁止写入 `errors/$form`（保持单一真相源）。  
- `rules` 必须显式表达动态列表语义与 identity 策略（见第 4 节）。  
- `rules/derived/traits` 三者的 path 锚点冲突必须“稳定失败”（抛错）并给出迁移建议：需要组合能力时回退到 `traits` 高级入口。

## 3) RulesSpec：用 decl list 表达“字段/列表/根规则”

`rules` 的推荐声明形态为“声明列表（decl list）”，每条声明承担单一职责：

```ts
// RuleInput：与 `Form.Rule.make(...)` 的输入形态保持一致
// - RuleConfig：RHF-like builtins（required/minLength/...）+ validate
// - RuleGroup：旧 `{ validate: Record<string, RuleEntry> }` 形态（保留但不推荐）
// - RuleFn：单函数（会被归一化为名为 "default" 的规则）
type RuleInput<Input> = RuleConfig<Input> | RuleGroup<Input> | RuleFn<Input>

/**
 * RulesNode（authoring AST）：
 * - zod-like 的组合式写法：`object/array/field` 递归嵌套；
 * - 节点本身不携带 path，path 来自节点在树中的位置（即 values/state 的 a.b.c 结构）；
 * - object 支持 `.refine(...) / .superRefine(...)` 表达对象级 refine（写回 `errors.<path>.$self`）；
 * - array 支持 `.refine(...) / .superRefine(...)` 表达 list-level/跨行校验（写回 `errors.<listPath>.$list` / `rows[]`）；
 *
 * 注：这里用概念类型表达；实现以 `packages/logix-form/src/dsl/rules.ts` 的裁决为准。
 */
type RulesNode<Input> = unknown

type RuleDecl<TValues extends object> =
  | {
      kind: "field"
      valuePath: string
      rule: RuleInput<any>
      /**
       * errorTarget：
       * - "$value"（默认）：写回 errors.<valuePath>
       * - "$self"：对象级 refine 的写回叶子，写回 errors.<valuePath>.$self
       */
      errorTarget?: "$value" | "$self"
    }
  | {
      kind: "list"
      listPath: string
      identity: ListIdentityPolicy
      item?: RuleInput<any> // 单行校验（输入为 row）
      list?: RuleInput<any> // 列表级/跨行校验（输入为 rows）
    }
  | { kind: "root"; rule: RuleInput<any> }

type FormRulesSpec<TValues extends object> = ReadonlyArray<RuleDecl<TValues>>
```

其中 `RuleInput` 对齐现有 `Form.Rule.make` 的输入能力（RHF-like 内置规则 + validate 函数 + deps + validateOn），并最终归一化为可挂载到 `StateTrait.node({ check })` 的 `RuleSet`（见 `packages/logix-form/src/rule.ts` 的 `RuleSet/RuleEntry`）。

### 3.1 authoring 语法糖：schema / at（同一份 decl list IR）

为兼顾“最少嵌套”与“按结构组织”，允许在 decl list 之上提供纯语法糖：

- `rules.schema(node)`：zod-like 的组合式入口（`object/array/field` 递归嵌套），最终编译为 decl list（field/list/root）。  
  - `rules.field(rule)`：字段叶子（字段规则）；`rule` 的输入形态与 `Form.Rule.make(...)` 的 config 保持一致（RHF-like builtins + validate + deps + validateOn）。  
  - `rules.object(shape)`：对象节点（只拼 path）；支持 `.refine(rule)` 表达对象级 refine（错误写回 `errors.<path>.$self`，避免覆盖子字段错误树）。  
    - `.superRefine(fn)`：一次校验写多个子路径（返回嵌套 error patch，或等价方式）。  
  - `rules.array(item, { identity })`：数组节点（显式声明 identity）；支持 `.refine(rule)` 表达 list-level/跨行校验（写回 `$list/rows[]`）。  
    - `.superRefine(fn)`：一次校验同时写 `$list` + 多行/多字段错误（等价于返回 `{ $list, rows }` 的结构）。  
  - 组合性：节点可以抽成变量/函数复用；深层 list 就是 `array(object({ nested: array(object(...)) }))`。  
- `rules.at(prefix)(...)`：在一个 prefix 下写相对路径（便于拆分/复用规则片段）；无论 authoring 采用 schema/at，最终都必须编译为同一份 decl list。

无论使用哪种 authoring 写法，最终都必须编译为同一份 decl list，并可稳定导出 RulesManifest（Static IR）。

## 4) ListIdentityPolicy：显式选择 row identity 策略

动态列表的稳定性必须通过显式 identity 策略来保证（FR-003/004，NFR-003）。

概念模型：

```ts
type ListIdentityPolicy =
  | { mode: "trackBy"; trackBy: string } // 推荐：使用业务字段（如 "id"）
  | { mode: "store" }                    // 运行时 rowIdStore（受控且可诊断）
  | { mode: "index" }                    // 明确接受 index 语义（可能错位）
```

当前实现的降级链路（事实依据）：

- `packages/logix-form/src/internal/rowid.ts`：`trackBy → rowIds/rowIdStore → index`。  
- `useFieldArray` 使用该策略生成 `fields[i].id`，用于 UI 稳定 key。

本特性的新增约束：

- 推荐路径必须要求 identity 显式选择；缺失时不得静默推断。  
- 任何降级（例如 trackBy 字段缺失/重复）必须可诊断并能在 Devtools 链路中解释（复用 010 的 `rowIdMode/degraded` 字段约定）。

### 4.1 深层嵌套列表（listIndexPath）与可解释定位

本仓的 FieldPath（Spec 009）刻意不携带索引与 `[]`，因此“深层 list instance”的定位必须分层表达（对齐 Spec 010 的 ValidateTarget 设计）：

- `path`：canonical list root（FieldPath 段数组），例如 `["orders", "items"]`（表示 `orders[].items` 这一层的 list root）。  
- `listIndexPath`：父层 list 的 index 链（从外到内），用于定位到具体 list instance；例如：
  - valuePath：`orders.3.items.2.product.sku`  
  - 对应 item target：`{ kind:"item", path:["orders","items"], listIndexPath:[3], index:2, field:"product.sku" }`  
  - 含义：在 `orders[3].items` 这个 list instance 上，定位第 `2` 行的 `product.sku`。

错误树的嵌套写回遵循同一结构递归展开：

- root list：`errors.orders.$list` / `errors.orders.rows[i].<...>`  
- nested list：`errors.orders.rows[i].items.$list` / `errors.orders.rows[i].items.rows[j].<...>`  

## 5) 错误树（Errors Tree）与优先级

错误树必须保持单一且确定：

- 规则错误：`errors.<...>`  
- 手动错误：`errors.$manual.<...>`  
- Schema 错误：`errors.$schema.<...>`（由 `Schema.decode` 的错误映射写回）

对象级 refine（跨字段校验）必须写到单独叶子，避免覆盖子树：

- object-level：`errors.profile.$self`

读取优先级固定：`manual > rules > schema`（事实依据：`packages/logix-form/src/react/useField.ts`）。

数组字段错误形态（事实依据：`packages/logix-form/src/path.ts`）：

- list-level：`errors.items.$list`  
- row-level：`errors.items.rows.0.name` / `errors.items.rows.0.product.sku`（values 的 index 会映射为 `rows.<index>`；row error patch 可携带嵌套对象）

多错误策略：

- 默认采用 **firstError**（稳定顺序下的首错）进入 errors 真相源；  
- all-errors 仅在诊断/Devtools 层展开，不进入 errors 真相源（避免膨胀与不可控 churn）。

## 6) 诊断事实源：RulesManifest（Static IR）+ trait:check（Dynamic Trace）

为保证“可解释/可对比/可回放”，规则系统必须导出一个不含函数体的静态清单（RulesManifest）：

- 静态：有哪些规则、scope 锚点、deps、validateOn、meta（JsonValue）。  
- 动态：复用 `trait:check`（010）的事件口径，给出 ruleId、scopeFieldPath、触发源、扫描/写回摘要、rowIdMode 与降级原因。

contracts 落点：

- RulesManifest：`specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`  
- FieldPath（canonical segments）：复用 009 的 schema（`$ref`）。
