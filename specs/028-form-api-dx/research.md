# Research: Form API 收敛与 DX 提升（关键裁决与证据）

**Feature**: `specs/028-form-api-dx/spec.md`  
**Plan**: `specs/028-form-api-dx/plan.md`  
**Created**: 2025-12-23

本文件用于把“推荐 API / 规则模型 / 列表语义 / 诊断证据 / 重构边界”的关键裁决收敛为可执行结论，并绑定到明确的契约与落点，避免实现先跑偏导致文档/示例漂移。

## Decision 1: 推荐路径引入 `rules` 顶层入口；`traits` 退为高级入口

**Decision**
- `Form.make` 的配置顶层新增 `rules`（推荐路径默认只配 `rules + derived`），`traits` 仍保留但明确定位为“底层/高级入口”。  
- `rules` 的目标不是引入第二套运行时：它必须可完全编译/降解为等价的 `StateTraitSpec`（最终仍由 `@logix/core` 的 state-trait build/validate 执行）。  
- 推荐引入 schema-scope 的入口 `Form.from(ValuesSchema)`：把 `derived/rules/traits` 的“类型收窄、路径提示、语法糖”统一挂在同一个 `$` 上（对齐 `Logix.StateTrait.from` 的命名习惯）。  
- `Form.make` 内部仍采用“合并后的 trait spec + validateOn wrapper + install wiring”链路（现有链路在 `packages/logix-form/src/form.ts` 已存在），只是把“规则声明入口”从 `traits.<path>.check` 的深嵌套组织，提升为 `rules` 的独立概念。

**Rationale**
- 当前 `Form.make` 对外主入口是 `traits?/derived?`（`packages/logix-form/src/form.ts`），业务侧为了表达校验必须进入 `traits` 的结构，导致概念耦合与嵌套偏深（尤其是 list scope：`items: { item, list }`）。  
- 规则（校验）与派生（联动）在心智与约束上本就不同：派生默认只允许写回 `values/ui`（`normalizeDerived` 已强约束），校验写回 `errors`；把校验入口独立出来可减少误用、提升 DX，并与 `derived` 的“独立字段”形态对齐。  
- `packages/logix-form/src/logics/install.ts` 已有 `rulesValidateOn` 相关接口，说明现有实现已在为“规则触发收敛”留接口；把 `rules` 变成一等公民可以把这条链路对外解释清楚。

**Alternatives considered**
1) **维持“全靠 traits 组织（含 list 嵌套）”**：最少改动，但继续让推荐路径暴露底层结构细节（DX 与 spec 的 FR-001/004 冲突）。  
2) **新增 `FormSpec` 二次包壳（把 values/derived/traits/rules 全包进去）**：会引入第二套概念命名空间，且更难做到“只配 rules 的最短路径”。  
3) **让运行时自动从 Schema 推断 list/校验**：隐式魔法过强，且与“可解释/可回放/显式 IR”原则冲突。

## Decision 2: `rules` 的核心形态是 decl list；并提供 zod-like 的 `schema/object/array/field` 语法糖（同一 IR）

**Decision**
- `rules` 的核心形态为“声明列表（decl list）”，每条声明只表达一个职责（字段规则 / 列表规则 / 根规则），例如：  
  - `Form.Rule.field(path, ruleGroup)`  
  - `Form.Rule.list(path, { identity, item, list })`  
  - `Form.Rule.root(ruleGroup)`  
  `const $ = Form.from(ValuesSchema)` 后，`Form.make({ rules: $.rules(...decls) })` 负责把 decls 编译为统一的 trait spec。  
- 规则 leaf 的输入形态与 `Form.Rule.make(...)` 的 config 保持一致（RHF-like builtins + validate），由 rules 编译层统一调用 `Form.Rule.make` 做归一化；业务侧无需在推荐路径显式写 `Rule.make`，从而让“内置校验器/自定义 validate/依赖声明”在同一入口对齐。  
- 同时提供两类语法糖，最终编译产物仍是同一份 decl list（便于稳定排序、对比、导出静态 IR）：  
  - `schema`：更像 zod 的组合式写法（`object/array/field` 递归嵌套，按 values 结构组织），用于“作者体验/可读性”；  
  - `at(prefix)`：在一个 prefix 下写相对路径（用于组装/抽取规则片段）。  
- `schema` 的节点提供 `.refine(...) / .superRefine(...)`（对象级 refine / 跨字段校验 / 跨行校验），错误写回仍使用稳定叶子 `errors.<path>.$self`（object）与 `errors.<path>.$list`（array）（见 Decision 8/9）。

**Rationale**
- decl list 对 LLM 与代码审阅更友好：每条声明都是独立、可排序、可 diff 的最小单元；减少“对象深层嵌套 + 同名字段混杂”的复杂度。  
- `schema/at` 只改变“作者写法”，不改变内核 IR：不引入第二套运行时/第二套真相源，也不会把隐式推断带回推荐路径。  
- 与现有 `Form.Rule.fields(...)` 的风格一致（`packages/logix-form/src/rule.ts`），扩展成本低，且天然符合 SRP/ISP。

**Alternatives considered**
1) **`rules` 继续采用 map 形态（key=path）**：仍会遇到 list 需要额外结构表达 item/list 的问题；且难以表达 root/list/item 的“同路径不同作用域”。  
2) **只做 decl list，不提供语法糖**：实现更简单，但对“按领域结构组织规则”的可读性不友好；`schema/at` 作为纯语法糖可以把 DX 做到位而不改变 IR。  
3) **引入新的 fluent builder**：DX 可能更强，但实现与类型复杂度更高；本特性优先保证“可编译到现有内核、可迁移、可解释”。

## Decision 3: 列表语义必须显式声明；缺失 identity 时必须“显式降级并可诊断”

**Decision**
- `rules` 的 list 声明必须显式包含 identity 策略（例如 `trackBy` / `store` / `index`），并将其作为对外心智模型的一部分（满足 FR-004 / NFR-003）。  
- 允许业务选择 `index`（明确表示接受错位风险），但不得再出现“没写 identityHint 也写了 item/list，就被隐式当作 list”的默认推荐路径。  
- 诊断与回放必须能解释：本次 list 采用了什么 identity 策略、是否发生降级、原因是什么；并复用既有 `trait:check` 事件字段（`rowIdMode/degraded` 对齐 010 的契约）。

**Rationale**
- 当前 `Form.traits` 会把“plain object 且包含 item/list/identityHint”的值归一化为 `StateTrait.list(...)`（`packages/logix-form/src/dsl/traits.ts` 的 `normalizeNodeOrListOrEntry`），因此 `items: { item, list }` 即使没有 `identityHint` 也会被当作 list trait；这会让“写法能跑”但“身份与错位风险不透明”。  
- `useFieldArray` 的 row id 生成会按 `trackBy → rowIdStore → index` 逐级降级（`packages/logix-form/src/internal/rowid.ts`），但若用户没有显式选择 identity，很难解释“为什么 fields[i].id 变了/错误错位”。  
- 显式 identity 是性能与可诊断性的前提：缺失时系统只能退回 index 语义（并输出降级证据），否则会产生不可回放的不稳定行为。
- 说明：上述“隐式 list 识别”只允许存在于 `traits` 高级入口（escape hatch）；`rules` 推荐路径必须显式声明 list 语义与 identity。

**Alternatives considered**
1) **把 `identityHint` 变成 list 的必填字段（无则直接报错）**：最严格，但会让 PoC/简单场景门槛过高；本特性选择“允许显式选择 index”以保持可用性。  
2) **保留隐式推断但加 warning**：warning 在缺少统一诊断协议时很容易变成噪声；且不利于形成“单一真相源（contracts + devtools）”。

## Decision 4: 规则触发语义保持“两阶段 + rule 级白名单”，并复用现有 wiring

**Decision**
- Form 级 `validateOn/reValidateOn` 仍作为默认两阶段策略（submitCount===0 vs >0），rule 级 `validateOn` 仅用于 `onChange/onBlur` 的白名单控制；`submit/manual` 始终运行。  
- 触发实现复用 `wrapTraitsForValidateOn` 的“rule wrapper + RULE_SKIP”机制，并复用其产物 `rulesValidateOn` 驱动 `Form.install` 的 wiring（`packages/logix-form/src/form.ts` + `packages/logix-form/src/logics/install.ts`）。  
- 新增 `rules` 入口后，`rulesValidateOn` 的统计必须覆盖来自 `rules` 的显式触发信息（用于最小 wiring）。

**Rationale**
- 现有链路已经满足“只在 blur 时跑显式 onBlur 规则、不会把全表 blur validate 变成常态”的关键诉求；本特性不引入新的触发模型，避免扩大风险面。  
- `install` 的 wiring 处于热路径（高频输入），保持触发策略稳定更利于基线对齐（NFR-001）。

**Alternatives considered**
1) **不做 wrapper，完全在 validate 引擎里按 metadata 过滤**：需要深入修改 `@logix/core` 的 state-trait validate hot path，风险更高；不符合“先收敛 API、后逐步优化”的增量策略。  
2) **让 UI 侧（React）用 useEffect 主动触发 validate**：会把运行时语义散落到 UI，破坏“可回放与可解释”的链路。

## Decision 5: 错误树契约保持单一；优先级与合并策略必须确定

**Decision**
- 错误树仍分三类来源，读取优先级固定：`manual > rules > schema`（UI hook 已按此读取：`useField` 读取 manual/rule/schema 三处并合并）。  
- 多错误合并策略必须确定：默认同一字段/同一 scope 下保持“稳定顺序下的 firstError”，避免 errors 膨胀；完整多错误仅作为诊断/Devtools 展示层能力（不进入真相源）。

**Rationale**
- errors 作为真相源必须 Slim（成本与 churn 可控）；把“全部错误”常态化会使写回与 diff 放大，伤害性能与可解释性。  
- `FormMeta.errorCount` 已用于 O(1) 的 `isValid/canSubmit`（`packages/logix-form/src/form.ts`），因此错误写回必须保持稳定与可预测。

## Decision 6: 新增 `RulesManifest`（Static IR）作为可序列化事实源，绑定到 contracts

**Decision**
- 规则系统必须提供一个不含函数体的可序列化“规则清单/静态 IR”（RulesManifest）：包含每条规则的 `ruleId`、scope、deps、validateOn、meta（必须满足 JsonValue 硬门）。  
- Devtools/调试面使用 RulesManifest + DynamicTrace（`trait:check`）建立解释链路：  
  - 静态：有哪些规则、锚点在哪、依赖是什么；  
  - 动态：本次为何触发、跑了哪些规则、跳过原因、list identity 是否降级。

**Rationale**
- 本特性要收敛 DX，必须支持“可对比/可解释”：仅靠运行时函数闭包无法跨宿主/跨会话对齐。  
- RulesManifest 是统一最小 IR（Static IR）的最小交付面：不引入第二套运行时，但为 devtools/sandbox/platform 提供稳定协议抓手。

## Decision 7: `packages/logix-form/src/form.ts` 的拆分以“纯函数内核 + 组合层”为边界

**Decision**
- 拆分目标：单文件 ≤ 400 行（FR-009），并形成“可单测的纯函数内核”。建议边界：  
  - reducer（values/ui/errors/$form）的纯函数更新与辅助计数（errorCount）  
  - controller（validate/validatePaths/reset/setError/clearErrors/handleSubmit）  
  - traits/rules/derived 的 normalize + merge + validateOn wrapper（含 rulesValidateOn 汇总）  
  - schema error mapping（`toSchemaErrorTree`）与 schema 写回策略  
  - array ops（append/remove/swap/move）与 aux 同步（errors/ui 的数组对齐）  
- `Form.make` 作为“组合层”保留，但只负责装配模块定义与组合上述子模块，不承载核心算法。

**Rationale**
- 当前单文件混杂 reducer、controller、path utils glue、trait wrapper 与 schema mapping，难以测试与演进；拆分后可针对规则触发、列表写回、错误优先级等关键行为补齐测试（FR-010）。

## Decision 8: `.refine(...) / .superRefine(...)` 支持对象级 refine，且必须“只写一个叶子”避免覆盖子树

**Decision**
- 在 `rules.schema` 的 object 节点上提供 `.refine(...) / .superRefine(...)`，表示“对当前对象节点本身挂规则”（输入为该对象；常用于跨字段校验/对象级约束）。  
- 对象级 refine 的错误写回语义固定为：`errors.<objectPath>.$self`，而不是 `errors.<objectPath>`；避免对象级错误覆盖/抹掉同一对象下的字段级错误树。  
- 为支持该语义，`@logix/core` 的 check 引擎需要支持 `CheckMeta.writeback.path`（当前 `CheckMeta.writeback` 已存在，但 validate 写回仍硬编码 `errors.${scopeFieldPath}`）；028 将补齐“按 writeback.path 写回”的能力，且不改变对外 public API。

**Rationale**
- “对象级 refine / 跨字段校验”是表单最常见的真实需求之一（例如两次密码一致、区间合法、组合必填）。  
- 若对象级 check 写到 `errors.profile`，会与 `errors.profile.firstName` 这类子字段错误发生覆盖竞争：执行顺序稍有变化就会导致错误丢失，且不可解释。  
- 把对象级错误稳定写到 `$self` 叶子，可以与子字段错误共存，并且 scoped 清理（增量校验/清错）也能做到“只影响自己”。

**Alternatives considered**
1) **仍写回 `errors.<objectPath>`，并靠执行顺序/合并策略兜底**：不可解释且脆弱，无法形成稳定契约。  
2) **在 validate 时对 object 结果做深 merge**：会引入隐式行为与额外成本，并容易与 list scope 的写回策略冲突；更适合作为显式 writeback 之后的可选优化，而不是默认语义。

## Decision 9: 嵌套列表（数组中包含数组）必须成为一等公民（递归 list scope + 可解释定位）

**Decision**
- 支持任意深度的“对象/列表嵌套”校验表达：在 `rules.schema` 的组合式写法中允许 `array(...)` 出现在任意嵌套对象层级（不要求把嵌套列表拆成独立 Form）。  
- scoped validate 的最小目标必须可表达“深层 list instance”：
  - `ValidateTarget.path` 仍使用 canonical FieldPath（Spec 009 段数组、无索引/无 `[]`）；  
  - 深层 list 的父层定位用 `listIndexPath: number[]` 表达（对齐 Spec 010 的 contracts 设计）；  
  - item 目标仍使用 `{ index, field? }`（index 属于当前 list；父层 index 在 listIndexPath）。
- runtime 必须把深层 list 的 identity/错误写回/诊断做成可复现、可解释链路：
  - RowId / trackBy 策略对每一层 list 都生效（缺失时可降级为 index，但必须给出降级诊断）；  
  - 错误树写回遵循“list 进入 errors.<listPath>.$list / errors.<listPath>.rows[]”的结构化约定，并在深层场景下按父层 `rows[index]` 递归嵌套（例如 `errors.orders.rows[i].items.rows[j].product.sku`）。  

**Rationale**
- 028 的 Edge Cases 已明确包含“嵌套列表与跨层依赖”；真实 ToB 业务常见“大 form 套小 form”，深层数组是必然形态，若只支持单层 list 将迫使业务回退到 UI 手写扫描与 setError（破坏可回放/可解释/性能边界）。  
- Spec 010 已预留 `ValidateTarget.listIndexPath` 与 `TraitLifecycle.Ref.fromValuePath(...)` 的多层 index 解析能力，但 `@logix/core` 当前的 state-trait validate 尚未消费 listIndexPath（且 rowIdStore / list runtime 仅支持单层）；028 直接把这条链路补齐即可实现“递归 list scope”而不引入第二套运行时。  

**Alternatives considered**
1) **要求业务把深层数组拆为多个独立 Form 模块**：组合成本高、提交/回放链路碎片化、跨层依赖表达更困难（形成第二套“编排”真相源）。  
2) **继续只支持单层 list，并把深层数组当作 row 内普通字段扫描**：可以返回嵌套错误对象，但无法提供深层 list 的独立 identity、增量校验与可解释诊断；在大表单中会退化为不可控的全量扫描。  

## Decision 10: 不引入 zod 作为内部依赖；只对齐 zod 的 authoring 体验

**Decision**
- 028 的目标是做“表单规则 DSL（可编译到 Logix/StateTrait）”，而不是“新的通用 schema validator”。  
- 我们会在 authoring 体验上对齐 zod（`object/array/field + refine/superRefine` 的组合直觉），但 **不** 把 zod 作为内部实现依赖；实现采用自有的轻量 RulesNode AST → decl list → trait spec 编译链路。  
- values/schema 仍以 `effect/Schema` 为主（本仓既定技术栈）；rules 侧仅复用其类型推导与路径提示，不引入第二套 schema 体系。  

**Rationale**
- 本体系的独特价值不在“能校验”，而在“交互态可控 + 可增量 + 可诊断 + 可回放”：`deps`/`validateOn`、list identity、scoped validate、RulesManifest（Static IR）+ trace（Dynamic），这些都不是 zod 的设计重心。  
- 引入 zod 会带来两套 schema/错误模型：values 用 `effect/Schema`，rules 又用 zod，会放大认知与迁移成本；且 zod 的内部 AST/解析策略并非为“可序列化 IR + 性能预算”设计。  
- 028 需要“编译到现有内核”（StateTrait/check/writeback）并输出 slim 证据；依赖第三方校验器会让 IR 口径和诊断链路更难收敛。  

**Alternatives considered**
1) **内部直接用 zod 的 schema 作为 rules authoring**：依然需要额外补齐 identity/触发/增量/诊断，且要依赖 zod 非稳定的内部表示来做编译，风险与耦合过高。  
2) **全仓迁移到 zod（values/rules 都用 zod）**：与 effect-first 的既定栈冲突，且会牵动大量现有类型/运行时集成，不符合 028 的聚焦范围。  

## Decision 11: `values`（effect/Schema）与 `rules` 的整合策略：schema 负责“内在约束”，rules 负责“交互约束”，并提供 schema→rules 的桥接

**Decision**
- `values` 仍以 `effect/Schema` 作为单一类型事实源；允许在 `ValuesSchema` 上直接表达**内在约束**与**默认错误信息**（例如长度、正则、数值范围、非空数组等）。  
- `rules` 保持为表单领域 DSL：负责**交互约束**（依赖 deps、触发 validateOn、跨字段/跨行、list identity 与 scoped validate），并编译到 decl list / trait spec / RulesManifest + trace。  
- 为减少重复与提升“像 zod 一体化”的体验，提供桥接能力（目标形态）：
  - 对外提供 `z.field(schema, opts?)`（函数重载）直接复用 schema 上的约束与 message（`fieldFromSchema` 仅作为内部实现 helper，不对外导出）；  
  - 或提供 `rules.fromValuesSchema(ValuesSchema)` 生成“字段级基础规则”（仅内在约束），业务侧再用 `schema/object/array` 叠加交互约束。  
 - 同时保留“零重复兜底”路径：`Form.controller.validate/handleSubmit` 仍会对整棵 `values` 做一次 schema decode，并把错误写到 `errors.$schema`；桥接主要用于把 schema 约束接入 rules 的增量/触发/诊断链路。  
 - `z.field(schema, opts)` 的关键点是 `opts`：允许在“复用 schema 基础约束”的同时，追加表单交互语义（`validateOn/reValidateOn`）与额外约束（`deps/validate`），避免同一字段同时写两套校验逻辑。  

**Rationale**
- effect/Schema 本身已经支持“约束 + message”的一体化：  
  - 类型错误可用 `Schema.String.annotations({ message: () => "..." })` 自定义 message；  
  - 具体约束可用 `Schema.minLength(n, { message: () => "..." })`、`Schema.pattern(re, { message: () => "..." })`、`Schema.lessThanOrEqualTo(x, { message: () => "..." })` 等 combinator 表达。  
  - 但它不包含表单交互域的核心能力（deps/validateOn/list identity/scoped validate/诊断证据），因此不能替代 `rules`。  
- 把“内在约束”留在 schema、把“交互约束”留在 rules，可以保持 SRP：domain 模型不被交互策略污染，同时仍能通过桥接实现“作者侧几乎一体化”的体验（减少重复声明）。  

**Notes**
- schema 的“必填/required”语义与表单常见的“空字符串视为未填”不完全等价；若需要 `""` 视为无效，可用 `minLength(1, { message })` 或等价 refine 表达（这也是桥接时需要明确的规则）。  
