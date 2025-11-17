# Feature Specification: Trait 生命周期桥接 × Form（以 StateTrait 为支点：数组/校验/异步，RHF≥）

**Feature Branch**: `004-trait-bridge-form`  
**Created**: 2025-12-11  
**Status**: Draft  
**Input**: User description: "和RHF看齐，起码>=它，支持下数组，创建个新的 spec，但是不切分支，我们只是先做规划"

---

## Positioning

本 spec 的大目标不是“做一个表单库”，而是：

- 以 **Trait** 作为内核抽象，明确 Trait 的生命周期与桥接契约；
- 以 **StateTrait** 作为“第一个支点 Trait”（最先跑通：数组、错误树、异步资源、可回放事务）；
- 在此之上建立一套 **Form 领域系统**（`@logix/form`），并保证同一条链路未来可以自然扩展到更多 `xxxTrait`：  
  上层领域包只是在复用 Trait 的标准化桥接能力（install / refs / validate / cleanup），而不是发明第二套运行时或第二套心智。
- 同时把 **Query 作为与 Form 平行的第二大领域**一起规划（先规划、后实现）：用于验证“同一套 kernel + bridge”是否能支撑另一类主心智（查询/缓存/竞态），避免 004 只在 Form 语境下自洽却无法外推。

因此，本 spec 同时承担两类约束：

1) Form 领域需求（RHF≥：FieldArray、错误树、rules、schema/transform、异步约束）；  
2) Trait 生态需求（标准桥接模式 + 最小 API 表面积 + 可回放/可生成/可诊断）。

在 Query 领域的“自动查询”体验上，本 spec 选择与 TanStack Query 的核心心智对齐：优先采用 `@tanstack/query-core` 的 `QueryObserver` 驱动 enabled/queryKey 变化下的自动行为；Logix Runtime 仍以 state 作为可回放事实源，并在写回时执行 `keyHash` 门控以保证回放语义一致。实现上，由 `@logix/query` 的集成层为每条“Query 领域的 source 规则”在其 runtime scope 内维护一个 `QueryObserver`，并在 scope 结束时执行 cleanup；Form 的 `source` 不强依赖 QueryObserver，默认仍只需调用 `ResourceSpec.load` 并写回快照。

## API Surface（最小集合）

本 spec 的核心目标之一是“**把 Form 做成 Trait 生态的第一个示范，而不是额外一套体系**”。为此我们把对外 API 的所有权与表面积做如下分层收口（拒绝向后兼容，优先寻求新的完美点）：

- **Trait Kernel（应归属 `@logix/core`）**
  - `StateTrait`（支点 Trait）：`from/build/install` + kernel verbs（`computed/source/link`）与表单语义糖 `check`
  - `StateTrait.node / StateTrait.list / $root`：纯编译期组合子（build 阶段展开为 kernel entries）
  - `TraitLifecycle`：标准桥接 helper（`install / Ref / scoped validate / cleanup`），用于把上层领域事件（如表单 change/blur/unregister/submit）接到 Module/Logic 上执行

- **Form 领域包（归属 `@logix/form`，业务默认入口，方案 B：Blueprint + Controller）**
  - `Form.make(...)`：产出 FormBlueprint（组合 Module + 默认 logics + traits/bridge wiring），用于业务侧以最少样板代码创建表单模块
  - `Form.Controller.*`：把 ModuleRuntime 投影为业务可用的 Controller（field/array/submit/validate 等），并保持全双工事实源
  - `Form.traits(...)`：可选语法糖入口（输出可 spread 的 `StateTraitSpec` 片段，可与 raw `StateTrait.node/list` 混用）
  - `Form.Rule.make(...)`：常用规则工厂（可组合、可语义化命名，最终回落为 `check`）
  - `Form.Error.*`：ErrorTree 组合/映射 helper（例如 list/item/$list/$item 的辅助构造、SchemaError 映射）
  - （可选）re-export：`Form.install = TraitLifecycle.install`、`Form.Ref = TraitLifecycle.Ref`（仅为体验，不改变所有权）

- **UI 适配层（如 `@logix/react`）**
  - 负责把真实 UI 事件（onChange/onBlur/…）映射为领域 action，并调用/触发 `TraitLifecycle` 维护 `state.ui` 与 scoped validate
  - 不得引入第二套不可回放“本地错误/交互态事实源”

## References

- 领域放置决策（Form vs 独立领域包 vs 最佳实践）：`specs/004-trait-bridge-form/references/01-module-placement.md`
- 链路叙事（Trait/StateTrait → Module → UI）：`specs/004-trait-bridge-form/references/00-trait-stack-narrative.md`
- Query 领域规划（与 Form 平行，外链）：`specs/004-trait-bridge-form/references/02-query-module-plan.md`
- Query 数据模型（外链）：`specs/004-trait-bridge-form/references/03-query-data-model.md`
- Query quickstart（外链）：`specs/004-trait-bridge-form/references/04-query-quickstart.md`
- Query × TanStack Query 集成契约（外链）：`specs/004-trait-bridge-form/references/05-query-tanstack-integration.md`
- Form 业务 API（方案 B：Blueprint + Controller）：`specs/004-trait-bridge-form/references/06-form-business-api.md`
- Query 业务 API（方案 B：Blueprint + Controller）：`specs/004-trait-bridge-form/references/07-query-business-api.md`

## Clarifications

### Session 2025-12-11

- Q: 数组元素的「身份」默认是按 index 还是按显式 id 绑定（影响错误归属与 Trait 语义）？ → A: 默认按 index 语义理解数组元素身份（与 RHF 一致），Trait 与错误模型都以 `items[index]` 为基准；如需稳定 identity，可在业务层维护 `id` 字段用于 UI key 或展示，但本 spec 的核心 IR 不依赖该字段。
- Q: 数组字段下的错误结构默认是与值结构同构的树，还是以路径字符串为 key 的字典？ → A: 默认采用与值结构同构的错误树（例如 `errors.items[index].fieldName`），用于与 `state.items[index].fieldName` 一一对应；路径字典只作为实现与适配层的可选手段，不纳入本 spec 的主 IR。
- Q: 首版正式支持的嵌套数组深度是多少，`sections[].items[]` 是否作为一等公民纳入 scope？ → A: 首版明确支持「两层嵌套」数组（例如外层 `sections[]` 下的内层 `items[]`），规范中将其视为一等公民场景，并要求 StateTrait.list / 错误模型 / Devtools 在该形态下工作良好；更深层级（3 层及以上）不禁止，但视为高级用法，不承诺首版 Devtools 具备完备可视化。
- Q: 通过列表操作新增数组元素时，默认是否立即执行 item.check（校验），还是只执行 item.computed（派生）？ → A: 默认只执行 item.computed，用于填充默认值、隐藏字段与 options 等；item.check 只在既有校验触发时机（如提交、显式校验）下运行，不在新增一行时立即触发，以避免“新增即报错”的体验与不必要的性能开销。
- Q: 针对数组本身的「至少一行 / 最少 N 行」这类约束，默认应通过 Schema（StateSchema.minItems）定义，还是通过 list.check 声明为列表级业务规则？ → A: 默认认为数组字段在值模型层面允许为空，「至少一行 / 最少 N 行」一律通过 list.check 声明为列表级业务规则；对应错误落在列表级错误节点（例如 `errors.items.$list` 或等价结构），Schema 层不强制定义 minItems，只作为未来可能的补充能力。
- Q: 根级规则与 Rules 命名空间如何对齐，是否需要单独的 Form.build / FormSpec 包壳？ → A: 不需要。根级跨字段/跨列表校验直接落为 `StateTrait.check`（写入 `errors` 子树），Rules 命名空间提供 `Form.Rule.make(config)` 作为默认根级规则工厂（产出等价的 `check(state, ctx)`），Form.traits 仅是可选语法糖入口，最终都编译为 StateTraitSpec。
- Q: Rules 工厂是否继续保留在 `Form.Rule` 命名空间，而不是提升到 Form 顶层？ → A: 是。Rules 作为**可选领域糖**保留在 `Form.Rule`，Form 顶层（如存在）只提供 `Form.traits(...)` 这一入口用于生成可 spread 的 Trait 片段，避免引入新的运行时 kind 或第二套 verbs。
- Q: 数组字段的错误节点在错误树上是否直接是数组（`errors.items[i]`），而不是额外再包一层 `items` 对象？ → A: 是。列表字段的错误节点就是与值结构同构的数组：`errors.items[i].field`；列表级错误统一挂在同一节点下的 `$list`（`errors.items.$list`）。
- Q: 表单语义层是否保留独立的 async 槽位 / AsyncRule？ → A: 不保留。所有异步约束与远程派生统一通过 kernel 的 `source + computed/check` 组合表达；如 Form.traits 提供便利写法，也只能映射为等价的 `source` 规则，不引入 onSuccess/onError 回调式 IR。
- Q: Trait / Form 领域糖里是否允许直接返回任意 Effect 作为异步执行体？ → A: 不允许。IO/异步实现必须收敛在 ResourceSpec.load（Effect）中，由 Runtime/Middleware 统一触发与接管；Trait 侧只做资源依赖声明与纯派生（computed/check）。
- Q: 跨字段/跨列表联动校验默认推荐写在根级 check 还是局部 check？ → A: 两者都允许；默认优先局部 check（贴近字段/列表归属、便于读写与局部复用），仅当规则需要同时写多个域的错误、或更适合集中维护时使用根级 check；用户文档需同时给出两种写法与取舍。
- Q: Form 场景的错误树根节点是否统一约定为 `state.errors`？ → A: 是。Form 场景统一以 `state.errors` 作为错误树根；所有 `check`（字段级 / item / list / root）默认写入同构的 `errors` 子树（如 `errors.items[index].field`），不额外引入可配置的 errorRootPath。
- Q: FieldError 的形状是否允许“多条命名错误”（对齐 RHF `types` / `criteriaMode="all"`）？ → A: 允许。`FieldError` 统一为 `string | Record<ruleName, string>`（无错误为 undefined）；默认返回 string（单条错误），需要多条/命名规则时返回对象以保留上限与 Devtools 可视化。
- Q: kernel 的 check/computed 是否支持 `Record<ruleName, fn>` 作为命名规则集合（单函数为语法糖）？ → A: 支持。`check/computed` 同时允许单函数与 Record 形态；当使用 Record 形态时，ruleName 作为诊断/展示的一等信息进入 Devtools 与错误树 leaf（Record 形态）。
- Q: 多条命名 check/computed 规则的执行顺序与合并语义是什么？ → A: 采用确定性深合并：Record 形态按 `ruleName` 字典序依次执行；返回 patch 做 deep‑merge。`check` 叶子若来自多条命名规则，合并为 `Record<ruleName, message>`（同名覆盖）；`computed` 叶子冲突时 last‑writer‑wins，dev 环境给出 warning。
- Q: Form 场景声明的 source 是否默认自动触发？触发枚举叫什么，并为 React 的 onBlur 等事件预留扣子吗？ → A: 是。Form.traits 中声明的 source 默认启用自动触发，触发枚举命名为 `onValueChange`（而不是 onKeyChange），并允许配置 `debounceMs`（仅对 onValueChange 生效）；同时预留 `onBlur` 等 UI 事件触发位：短期可由 @logix/react 的表单绑定层在对应事件发生时显式调用 refresh，长期可将这些事件纳入统一的 triggers 语义。
- Q: source 字段写回的值是否需要包含 loading/error（表单与 Devtools 可直接消费）？ → A: 需要。source 统一写回 `ResourceSnapshot`（`status: "idle" | "loading" | "success" | "error"` + `data?/error?`），而不是仅写回 raw data；表单/Devtools 直接读 snapshot，视图层再通过 computed/check 派生 options 与用户可见错误。
- Q: `ResourceSnapshot` 是否需要携带本次请求参数（resource key）用于 Devtools/回放/排查？ → A: 需要。snapshot 必须携带 `key`（与 ResourceSpec.keySchema 对齐），用于识别“当前数据对应哪个 key”与处理 key 变化下的竞态。
- Q: key selector 是否允许返回 undefined 表示“禁用/不触发”，并把 snapshot 置回 idle？ → A: 允许。key selector 返回 undefined 时视为“当前无有效 key”，不得触发 IO，目标字段写回 `{ status: "idle" }`（不携带 key）。
- Q: 当 key 高频变化导致请求乱序返回时，是否丢弃 stale 结果避免旧 key 覆盖新 key？ → A: 丢弃 stale 结果。只有当返回结果的 key 仍等于“当前 keySelector 推导的 key”时才允许写回 snapshot；否则忽略该结果，保持当前 snapshot 不被覆盖。
- Q: key 的“相等性/去重/竞态判断”是否基于 keySchema 规范化后的稳定 hash（keyHash）？ → A: 是。运行时必须先用 `ResourceSpec.keySchema` 规范化 key，再计算稳定的 `keyHash`，并以 `keyHash` 作为唯一的相等性/去重/竞态判断依据（而不是对象引用或不稳定的 JSON stringify）。
- Q: trait 触发的 resource 请求在竞态下是否允许选择并发策略（switch/exhaust）？ → A: 允许。每个 source 规则可选 `concurrency: "switch" | "exhaust"`（默认 `switch`）：`switch` 以“最新 key”为准（尽量取消旧 in-flight，且无论能否取消都必须丢弃 stale 结果）；`exhaust` 在 in-flight 期间忽略新的触发，但会记录一次 trailing refresh，当前请求结束后自动补一次“最新 key”的刷新（仍需 stale 丢弃）。

### Session 2025-12-12

- Q: 是否引入 `StateTrait.node` 作为统一 DSL 形状，并将数组 scope 命名从 perItem/perList 收敛为 item/list？ → A: 是。`StateTrait.node` 作为纯编译期组合子统一承载 `computed/check/source/link` 的声明形状；数组字段通过 `StateTrait.list({ item, list })` 表达两种输入域（单行/整列），不再使用 per* 前缀，降低心智负担并为未来 *Trait 同源形状铺路。
- Q: Form.traits 声明的 source 默认触发是否包含 onMount（用于编辑/回填时初始拉齐依赖资源）？ → A: 包含。Form.traits 的 source 默认采用 `triggers: ["onMount", "onValueChange"]`：既保证初始有值时能自动拉齐依赖资源，也保证输入变化时实时更新；若担心资源风暴，可改为 `triggers: ["manual"]` 或配合 `concurrency: "exhaust"` 与 `debounceMs` 收敛触发频率。
- Q: triggers 是否允许包含 "manual"，以及能否与其它触发混用？ → A: 允许包含 "manual"，但必须严格独占：只能写成 `triggers: ["manual"]`，不得与 `onMount/onValueChange/onBlur` 等混用，避免“既自动又手动”的歧义。
- Q: source.resource 是否允许传对象以承载蓝图元信息？这些元信息是否影响运行时语义？ → A: 允许。`resource` 允许为 `string | ResourceRef`（`{ id, meta? }`），运行时只使用 `.id` 查找 ResourceRegistry；`meta` 仅用于 Devtools/文档/代码生成等“蓝图展示/诊断”，不得影响运行时执行语义（否则会破坏全双工可回放与边界清晰）。
- Q: 同一 resourceId 在同一 Program 内出现多个不同 ResourceRef.meta 时如何处理（只影响展示/诊断）？ → A: dev 环境给出 warning 并采用确定性 first-wins：按 ownerFields（使用该 resourceId 的 fieldPath）字典序最小的那一处作为 canonical meta；其它 meta 不参与合并。建议工程内始终维护“每个 id 一个 ResourceRef 常量”避免冲突。
- Q: ResourceRef 的工程组织（id/spec 是否强制拆分文件）？ → A: 不强制。文档给出推荐组织方式（例如 id/spec 拆分）以降低耦合与 bundle 风险，但允许在小项目或局部场景把 id/spec 放在同一个文件里。
- Q: ResourceRef.meta 是否开放任意 Record，还是白名单字段集合？ → A: 白名单字段集合（`label/description/tags/owner/docUrl`）。meta 只服务于展示/诊断/生成，不允许演进成半套配置系统；运行时语义字段必须留在 ResourceSpec.meta / Middleware 配置中。
- Q: Devtools 展示资源信息时，ResourceRef.meta 与 ResourceSpec.meta（如 description）同时存在如何取舍？ → A: merge（只影响展示）：ResourceRef.meta 优先；缺失字段再 fallback 到 ResourceSpec.meta 中同名字段（例如 description），不做深合并，不引入执行语义。
- Q: 当 ResourceRef.meta.description 与 ResourceSpec.meta.description 同时存在且不一致时，Devtools 是否应在 dev 环境提示？ → A: 是。dev 环境 SHOULD 给出 warning（按 resourceId+字段去重），提示“展示元信息分叉”，但不影响执行语义；展示仍遵循 ResourceRef 优先、缺失再 fallback 的规则。
- Q: ResourceRef.meta.tags 的语义是否规范为“分类标签”（用于 Devtools 过滤/分组），并要求展示层做去重+排序以保证稳定性？ → A: 是。tags 只用于展示侧的分类/过滤/分组，不影响执行语义；Devtools 展示与索引时应对 tags 做去重与字典序排序，保证全双工稳定可对比。
- Q: keySelector 是否允许返回 undefined 作为通用的“禁用/无有效 key”语义（不仅 Form.traits）？ → A: 允许。kernel 的 `StateTrait.source` 允许 `keySelector` 返回 `undefined` 表示“当前无有效 key / 禁用”，此时不得触发 IO，并将目标字段写回为 idle 快照（Form 场景为 `{ status: "idle" }`）；Form.traits 只是默认给出更甜的 triggers，但 key=undefined 的禁用语义是 kernel 的通用能力。

- Q: `check` 的返回值在不同作用域下是否必须是“相对 scope 的错误 patch”，还是一律从 `state.errors` 根写 GlobalErrorTree？ → A: 必须是相对 scope 的错误 patch：field/node 返回 FieldError；list.item 返回 ItemErrorTree；list.list 返回 ListErrorNode（数组节点，允许同时写 `$list` 与多行）；仅 `$root.check` 才返回 GlobalErrorTree（从 errors 根写入）。
- Q: Form 领域糖（`Form.traits` / `Form.Rule`）的落点是新增包还是放在 core？ → A: 新增独立包 `@logix/form`：只承载“表单领域糖与 helper”（Rules / traits / 迁移映射），不引入第二套运行时；最终必须编译为等价的 `@logix/core` StateTraitSpec（kernel 主线仍是 StateTrait → Program/Txn/EffectOp/Resource）。
- Q: 跨行/列表级联动校验在 `list.list.check` 下的写入能力如何定义（只写 `$list` 还是也能写行级错误）？ → A: `list.list.check` 允许同时写 `$list` 与任意行/字段的错误（`errors.items[i].x` / `errors.items[i].$item`），以覆盖真实 ToB 场景；其返回值仍是相对 scope 的 ListErrorNode（数组节点 + `$list`），不要求回退到 `$root`。
- Q: 嵌套数组（如 `sections[].items[]`）下的 ctx 如何提供最小且可扩展的定位信息（便于规则读取上下文）？ → A: 采用 `listIndexPath + index`：list ctx 固化 `listIndexPath`（list 实例锚点，如 `[sectionIndex]`）；item ctx 固化 `listIndexPath + index`（可拼出完整 indexPath），避免把所有层级都摊平进 ctx 字段，同时保持两层嵌套一等公民。
- Q: `StateTrait.list` 的 `item/list` 两个 scope 是否必须同时声明？ → A: 不必须。`item` 与 `list` 都是可选的：默认只声明 `item`（每行规则/派生/资源）；只有在需要“跨行/列表级”规则或摘要（如唯一性、单调性、最少 N 行）时才补充 `list`，避免无谓的 API 表面积。
- Q: `source.triggers` 的命名应更偏“状态语义”还是更贴近 UI 事件？ → A: kernel 统一使用状态语义命名：`onValueChange`（保留 `onBlur`），避免与 UI 层事件混淆；React 适配层负责把 input 事件映射为值变化触发。
- Q: 校验能力在 Rules（RHF rules 对标）与 Schema（effect/Schema）之间如何分工？ → A: 采用双轨但同构落盘：Rules 负责“输入体验/即时反馈”（field/item/list/root 的 check），Schema 负责“提交/边界校验 + transform”（decode 失败需可映射回同一套 ErrorTree）；两者产出的错误最终都落在同构的 `state.errors`，不要求开发者二选一。
- Q: Schema 解码错误映射（helper）应归属到 `@logix/form` 的哪个命名空间？ → A: 归属到 `Form.Error`：`Form.Error.fromSchemaError(error)`，因为它本质是“错误结构与映射”，而不是校验规则本身；`Form.Rule` 只负责产出 `check`。
- Q: FieldError leaf 是否要支持 RHF `criteriaMode="all"` 那种“多条命名错误”（保留校验上限）？ → A: 支持。`FieldError` 固化为 `string | Record<ruleName, string> | undefined`（undefined 表示无错误）；默认简单场景返回 string，需要保留多条命名规则输出时返回 Record，以便 Devtools/Studio 可展示 ruleName。
- Q: `ListErrorNode`（数组节点 + `$list`）在 TypeScript 中如何避免强转、写出“真实代码感”的构造方式？ → A: 保持错误模型“数组节点 + `$list`”不变，但在 `@logix/form` 提供极薄的 helper：`Form.Error.list(items, { list?: FieldError })`（或等价 API）用于构造 `ListErrorNode`，quickstart/用户文档推荐使用它避免 `as any`。
- Q: `Form.Error.list(items, opts)` 的 opts 是否应该暴露 `$list`（带 `$`），还是用更友好的入参名？ → A: opts 使用更友好的入参名：`{ list?: FieldError }`（不暴露 `$`）；helper 内部负责写入 `$list`。错误树的事实源仍然是 `errors.items.$list`，不改变 IR。
- Q: 行级聚合错误（`$item`）是否也应提供对称的 helper，避免用户侧接触 `$`？ → A: 是。`@logix/form` SHOULD 提供对称 helper：`Form.Error.item(fields, { item?: FieldError })`，内部写入 `$item`；错误树事实源仍为 `errors.items[i].$item`，不改变 IR。
- Q: touched/dirty/focus/blur/unregister/滚动到首错/局部校验等“表单交互态”是否需要进入全双工可回放链路？ → A: 需要。交互态 SHOULD 存放在 Module state 的 `state.ui`（或等价命名）的专用子树中，由 `@logix/form` 维护其更新（通过 action/reducer/logic），并与 StateTrait 的校验触发（validate）形成稳定配合；React 层仅负责把 DOM 事件映射为“值变化/失焦/注销”等领域事件，不在组件本地维护第二套不可回放的交互态事实源。
- Q: `state.ui.touched/dirty` 的结构是走“同构值树/同构错误树/路径字典”哪一种？ → A: 采用与 FormView 值结构同构的布尔树：字段就是字段、数组就是数组（与 errors 的同构心智一致但不引入 `$list/$item`），便于按路径读写与 Devtools 可视化；实现层允许内部使用路径字典优化，但对外 SSoT 与 API 心智以同构树为准。

### Session 2025-12-13

- Q: `computed/source` 是否强制要求显式 deps（不做隐式推导）？ → A: 是。所有 `computed/source` 必须显式声明 `deps`（相对当前 scope 的字段路径）；Runtime watcher 仅订阅 deps，Graph/Plan/Devtools 以 deps 作为依赖边与解释依据，禁止从函数体或 key/derive 隐式推导依赖。
- Q: `computed/source` 能否通过 Proxy 自动收集依赖来免写 deps，并把该能力下沉到 kernel？ → A: 不下沉。Proxy 自动收集依赖最多作为 DSL/工具层的可选辅助（例如 dev-only 的“推导 deps → 生成显式 deps → 对比校验报警”）；最终 IR 仍必须落为显式 `deps`，运行时不得引入动态依赖追踪机制，避免依赖集合随分支/输入变化导致不可解释与正确性风险。
- Q: 004 的“自动查询”实现，最终选择哪种？ → A: 选择方案 A：使用 `QueryObserver`（`@tanstack/query-core`）驱动自动行为（enabled/queryKey 变化），写回 state 前仍执行 `keyHash` 门控。
- Q: `QueryObserver` 的生命周期/作用域我们定为哪种？ → A: 每条“Query 领域的 `StateTrait.source` 规则”在其 runtime scope 内各自维护一个 `QueryObserver`，scope 结束时统一 cleanup。
- Q: 004 是否需要在本轮明确 `@logix/form` 的业务 API 形态（面向业务开发的默认入口），而不仅仅是 kernel/bridge/IR？ → A: 是。SSoT 仍以 TraitLifecycle + StateTrait IR（`node/list/source/computed/link/check`）为底，但同时选择方案 B：Blueprint + Controller（`Form.make`）；由 Form 领域包组合 Module + 默认 logics + traits/bridge wiring，React 侧只做投影与事件适配，不引入第二套事实源（详见 `references/06-form-business-api.md`）。
- Q: Query 领域包是否也采用与 Form 一致的“Blueprint + Controller”业务入口（`Query.make`），并通过分形 Module 的 imports/useLocalModule 接入？ → A: 是。`@logix/query` 与 `@logix/form` 平行：业务默认入口均为 Blueprint + Controller，Query 的 TanStack 集成与触发/并发语义仍回落到 StateTrait/Resource 的主线约束（详见 `references/07-query-business-api.md`）。

---

## User Scenarios & Testing *(mandatory)*

> 本特性站在「Trait 生态」视角，目标是固化一条可复用的链路：  
> **Trait（内核）→（可选）StateTrait（支点）→ Form（领域包）**，并让这条链路未来可以自然扩展到更多 `xxxTrait`。  
>
> 说明：  
> - `StateTrait` 是本 spec 选定的“第一个支点 Trait”（率先跑通数组/错误树/异步资源/事务可回放），但它不是强制中间层；某些领域也可以走 **Trait → Form** 的直接链路。  
> - Form 的目标不是“又一套表单运行时”，而是通过 `@logix/form` 提供自解释、可组合、可回放的 API 体系，并把可复用的“桥接玩法”下沉到 Trait 生命周期层（install/refs/validate/cleanup）。

### User Story 1 - Trait 作者沉淀可复用的桥接玩法（P1）

作为 Trait/Runtime 维护者（或领域能力作者），我希望：

- Trait 能提供一套标准化的“生命周期桥接”能力（如 `TraitLifecycle.install / Ref / validate / cleanup`），把上层领域事件接到 Module/Logic 上执行；
- 这套桥接能力不与 Form 绑定：Form 只是第一个领域包示范；未来的 `QueryTrait` / `PermissionTrait` / `WorkflowTrait` 也能复用同一套形状；
- Devtools 能以同一套心智观测：上层事件 → state.ui/state/errors 变更 → trait 规则执行（可回放、可追踪、可解释）。

**Why this priority**  
如果桥接模式不下沉并固化，上层领域包会各自发明 glue 逻辑，最终导致 API 不一致、心智不自洽，也无法作为未来 `xxxTrait` 的榜样。

**Independent Test**

- 用同一份“桥接生命周期”设计，分别支撑：
  - Form 的 blur/submit/validate/unregister；
  - 另一个假想领域（例如 Query 的 refresh / invalidate）；
- 让两位工程师只看文档就能写出它们的“安装点”（ModuleImpl.logics）与“调用点”（dispatch 领域 action）的代码草图。

**Acceptance Scenarios**

1. **Given** 一个新的领域 Trait（非 Form），**When** 它选择复用该桥接玩法，**Then** 它能在不发明第二套 Runtime 的情况下，把领域事件接入 Module/Logic，并保持可回放与可诊断。
2. **Given** Form 与另一个领域 Trait 同时存在，**When** 工程师阅读其安装/调用方式，**Then** 能在 10 分钟内理解它们共享的桥接结构（install/ref/validate/cleanup），而不需要重新学习一套概念。

---

### User Story 2 - Form 领域包提供自解释且自包含的 API（P1）

作为 `@logix/form` 的使用者（业务前端/框架侧），我希望：

- 我可以把“输入事件（change/blur/unregister/submit）”映射为少量领域 action，并通过 install 一次性接入（维护 `state.ui` + 触发 scoped validate + 写回 `state.errors`）；
- 我能用 `Form.Error.*` / `Form.Rule.*` 组合出清晰的错误树与规则库，而不需要在 UI 层手动 `setError/clearError`；
- Form API 的命名与结构足够自解释：读起来就知道在做什么，并且不要求先理解 Effect/Runtime 内核细节。

**Why this priority**  
最终用户是大量“没接触过 effect 的前端开发者”。Form API 需要在保持上限的同时，尽可能自解释与自包含，才能成为可推广的样板。

**Independent Test**

- 给出一个“复杂表单最小模块”的代码草图：包含 `state.ui`、`state.errors`、以及数组字段；
- 新工程师在 30 分钟内把 UI 事件映射为领域 action，并能跑通：
  - blur 显示错误；
  - submit 全量校验；
  - unregister 清理错误与 touched。

**Acceptance Scenarios**

1. **Given** 一个不熟悉 Effect 的前端工程师，**When** 他只看 quickstart 与 API 说明，**Then** 能完成 “安装 Form + 接入一个字段校验 + 渲染错误提示” 的闭环。
2. **Given** 一个包含数组字段的表单，**When** 工程师使用 `Form.Error.list/item` 构造错误与 `Form.Rule` 组织规则，**Then** 不需要写任何类型强转或 `$list/$item` 的底层细节。

---

### User Story 3 - 模块作者在复杂表单中声明数组级 Traits（P1）

作为 Logix 模块作者，我希望在包含数组字段（如订单行、动态联系人列表）的复杂表单中，能够像 RHF 一样自然地：

- 声明针对数组元素的计算字段（如每行小计）、联动逻辑（如勾选某行自动影响汇总），以及校验逻辑（行级错误）；
- 使用统一的「字段路径 / DSL」来表达这些 Trait，而不是为数组单独写一套 ad-hoc 逻辑；
- 同时保留良好的类型安全与可读性，至少不弱于我在 RHF 中使用 `Path<TFieldValues>` / `FieldArrayPath<T>` 的体验。

**Why this priority**  
数组 + 联动是 ToB 表单的高频难点场景，如果 StateTrait 在这里「短板明显于 RHF」，会直接影响 Logix 被前端团队采纳的可能性。因此需要优先在概念层和规范层把能力和边界定义清楚。

**Independent Test**  
仅实现本场景，就可以通过以下方式独立验证：

- 给出一个典型「订单 + 收货信息」表单的 StateSchema + TraitSpec 示例，包含：
  - 至少一个 FieldArray（如 `items`），包含多字段（name/quantity/price 等）；
  - 至少一个数组级计算 Trait（如总金额）；
  - 至少一个数组级联动 Trait（如选中行控制汇总）；
  - 至少一个行级错误 Trait（如某一行字段不合法）。
- 由两名不同背景的前端工程师（熟悉 RHF / 不熟悉 RHF 各一人）在不看实现代码的前提下，能根据文档推导出等价的 TraitSpec 写法，并确认其表达力足以覆盖 RHF 的 FieldArray 常见场景。

**Acceptance Scenarios**

1. **Given** 一个包含数组字段的复杂表单需求（如订单行 + 联系信息），**When** 模块作者根据本 spec 在 StateSchema + TraitSpec 中声明数组元素级的计算/校验/联动逻辑，**Then** 其表达能力至少能覆盖 RHF 文档中的典型 FieldArray 示例（增删行、行级校验、联动汇总），且不需要额外的 ad-hoc 状态。
2. **Given** 一份基于本 spec 编写的 TraitSpec，**When** 不同模块作者阅读该 TraitSpec 与配套文档，**Then** 可在 10 分钟内准确说出每个 Trait 针对的是哪个数组字段、哪个元素层级、与哪些字段存在依赖关系。

---

### User Story 4 - 表单开发者将数组错误与 UI 控件对齐（P1）

作为使用 Logix 的表单开发者（React / 其他 UI 框架），我希望：

- 能以清晰、稳定的结构读取表单状态中的错误信息（包括数组元素级错误），并一一映射到具体的输入控件；
- 不需要为 Logix 单独维护一套错误对象形状，而是将 Trait 定义的错误模型与 UI 库（如 RHF、内部 Form 组件）进行自然对接；
- 当数组增删/重排时，错误信息的归属行为是可预期的，有明确的规范说明。

**Why this priority**  
表单错误提示体验直接影响最终用户感知，且往往是业务表单开发中最痛的点之一。如果 Logix 的数组错误模型与常见表单库（尤其是 RHF）差异过大，接入成本会显著增加。

**Independent Test**

- 构造一个包含 FieldArray 的示例模块 + 表单 UI，只关注：
  - Trait 中的错误声明；
  - 状态中的错误结构；
  - UI 侧如何根据路径与错误结构渲染错误提示；
- 验证开发者可以在不阅读 Logix 内部实现的前提下，根据文档完成：
  - 行级错误的渲染；
  - 删除/添加行后的错误归属调整；
  - 提交失败时的「滚动到第一条错误」等交互。

**Acceptance Scenarios**

1. **Given** 一个由本 spec 定义错误模型的复杂表单模块，**When** 表单开发者参照文档接入 UI（例如使用内部 Form 组件或 RHF），**Then** 可以在 30 分钟内完成数组错误的渲染与联动，而无需额外引入 ad-hoc 错误状态。
2. **Given** 用户在含有 FieldArray 的表单上制造多种错误（缺行、行内字段错误、联动错误），**When** 触发一次统一的「提交」操作，**Then** 所有错误提示都能正确对应到具体控件，且数组增删/重排不会导致错误提示错位。

---

### User Story 5 - 架构师从 SSoT 理解 Trait 链路与边界（P2）

作为负责 Logix 平台规划的架构师/规范维护者，我希望：

- 在 docs/specs 中，有一份清晰的章节描述 “Trait →（可选）StateTrait → Form” 这条链路的角色与边界；
- 这份规范既能与 RHF 的字段路径/错误模型做对照，也能作为未来 `xxxTrait` 的模板（桥接玩法、错误/交互态事实源、可回放策略）；
- 当后续实现/演进 Trait 生命周期桥接、StateTrait 数组支持、Form 集成与 Devtools 视图时，都可以直接引用本 spec 作为唯一事实源，而不是每次重新解释。

**Why this priority**  
Trait 链路一旦落实现，会牵动 StateSchema、TraitSpec、Runtime/Devtools、表单库适配、未来其他领域 Trait 等多个层面。如果没有清晰的 SSoT，后续实现容易「各说各话」，导致难以维护。

**Independent Test**

- 抽象出至少 3 种数组使用模式（简单列表、嵌套数组、跨字段联动），在本 spec 中给出统一的概念抽象与术语；
- 由未参与本 spec 编写的工程师审阅文档后，为这 3 种模式各自设计一个 TraitSpec 草图，并指出实现/Devtools 的落点；
- 评审时确认这些草图没有违背 SSoT，对应关系清晰。

**Acceptance Scenarios**

1. **Given** 本 spec 与现有的 StateTrait SSoT 文档，**When** 新工程师在不看代码的情况下阅读这些文档，**Then** 能够区分：
   - 「Trait 生命周期桥接」与「领域包语法糖」的差别；
   - `StateTrait` 作为“支点 Trait”的角色，以及何时可以直接走 Trait→领域包；
   - 「Trait 表达能力 ≥ RHF」意味着什么（能力上限 vs 路径语法兼容）。
2. **Given** 一个新需求涉及「数组字段 + 校验 + 联动」，**When** 架构师根据本 spec 评估其是否属于当前阶段 scope，**Then** 可以在 10 分钟内判断该需求是：
   - 已被本 spec 覆盖；
   - 需要延伸 spec（如嵌套数组的更深层支持）；
   - 需要交给后续版本处理。

---

### Edge Cases

- 当数组为空时（例如 `items.length = 0`），数组级 Trait（汇总、错误）如何定义「0 行」的语义（如总金额=0、是否视为错误等）？
- 当数组中存在大量元素（例如 100+ 行）时：
  - Trait 对每一行进行计算/校验是否有「节流 / 采样」语义约束？
  - 增删/重排时 Trait 执行次数和事务边界如何控制？
- 对于嵌套数组（如 `sections[].items[]`），本 spec 明确将「两层嵌套」（外层 section 列表 + 内层 items 列表）纳入首版正式 scope：  
  - 需要在概念层定义「两层数组元素级 Trait」的行为语义，并确保 Trait DSL（StateTrait.list）/ 错误模型可以自然覆盖该结构；  
  - 要求 StateTrait.list 与 Devtools 至少能覆盖「外层 section + 内层 items」这类典型两层嵌套结构；更深层级（3 层及以上）可以在实现上支持，但视为高级用法，不作为本轮 Devtools 视图与文档的强制要求。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 · 数组字段路径模型**  
  规范 MUST 定义「数组字段 / FieldArray」在 State 模型中的路径语义，至少能够表达「数组元素级」的 Trait 作用范围（例如通过显式数组段或等价 DSL），并给出与 RHF 字段路径（如 `items.0.name` / `items[index].name`）的概念映射关系。

- **FR-002 · 数组元素级 Trait 能力**  
  StateTrait 模型 MUST 支持在数组元素层级挂载以下类别的 Trait：
  - 计算型（computed）：如每行小计、聚合 summary；
  - 联动型（link）：如列表字段驱动其他字段联动；
  - 校验型（validation）：如行级错误、整体列表错误。  
  这些能力的表达力在业务上 MUST 至少覆盖 RHF FieldArray 的典型用法（增删行、行级校验、联动汇总），允许通过更抽象的 DSL 或 Helper 实现，而不强制要求与 RHF 的字符串路径语法一一对应。
  - 默认行为上，新增数组元素时 Runtime 必须自动执行 item.computed（派生默认值/联动 meta）以确保状态正确；item.check 的执行时机则沿用整体校验策略（例如 onSubmit / 显式 validate 调用），不得在新增一行时强制立即触发全量校验，以避免“新增即报错”的体验与不必要的性能开销。

- **FR-003 · 错误模型与 UI 映射**  
  规范 MUST 定义一个面向数组字段的错误模型：
  - 能够表示行级错误、字段级错误以及整体列表错误；
  - Form 场景统一约定 `state.errors` 为错误树根节点，所有 `check` 的返回 patch 默认写入该同构 `errors` 子树；
  - 默认采用与值结构同构的错误树模型：例如 `errors.items[index].fieldName` 与 `state.items[index].fieldName` 一一对应，嵌套数组下错误树与嵌套值结构保持同构；  
  - 列表级约束（如「至少一行 / 最少 N 行」）默认通过 list.check 声明为业务规则，其错误落在列表级错误节点（例如 `errors.items.$list` 或等价结构），而不是在 StateSchema 中强制定义 minItems；  
  - 可在实现或适配层利用「以路径为 key 的错误字典」作为内部表示或桥接手段，但本 spec 的主 IR 与文档示例一律以同构树模型为准；  
  并通过示意/示例说明常见 mapping 场景（表单项下方错误、列表顶部错误、提交摘要错误等）。

- **FR-004 · 数组操作语义（增删 / 重排）**  
  规范 MUST 明确数组增删、重排时 Trait 与错误模型的语义，包括但不限于：
  - 行被删除后，该行相关 Trait / 错误的清理策略；
  - 行在中间插入/重排时，错误与派生语义默认随 index 重新计算，即将数组元素身份视为 `items[index]`（与 RHF 一致）；  
  - 在文档中给出「默认 index 身份」的 trade-off 说明，并推荐在需要稳定 identity 的场景下在业务层维护 `id` 字段（用于 UI key / 展示），但不将 `id` 納入本 spec 的核心 IR。  

- **FR-005 · Devtools / SSoT 可视化视图**  
  规范 MUST 要求 Devtools / runtime-logix 文档中，以清晰的方式呈现数组字段上的 Trait 结构与行为：
  - TraitGraph 能区分「列表字段节点」与其 Traits；
  - StateTransaction / Timeline 能在高层概览中反映「一次操作对哪些行产生了 Trait 更新」；  
  具体实现细节由后续 runtime spec 承载，本 spec 只负责约束需要呈现的概念和层级。

- **FR-006 · RHF 对齐边界定义（能力 ≥，路径不强制兼容）**  
  规范 MUST 明确「与 RHF 看齐 / 优于 RHF」的含义和边界，重点在于**表达能力与错误模型**至少不弱于 RHF，而不是在字符串路径层面 1:1 兼容：  
  - 必须在概念与 DSL 能力上覆盖 RHF FieldArray 的典型用法（如增删/插入、行级校验、跨字段联动），包括嵌套数组场景；  
  - 可以在字段路径语法与错误对象结构上与 RHF 存在差异（例如通过 kernel DSL（StateTrait.list）/ Helper 表达数组元素级行为，而不直接使用 `'items.0.name'` 这类路径作为规范的一部分）；  
  - 必须提供一份面向实际项目的「迁移指南」，说明如何将典型 RHF 表单（含 FieldArray）迁移到 StateTrait 模型（含 list/check），包括字段路径、错误结构、增删/重排语义的对照表；  
  - 若未来提供 RHF 适配层，可在适配层处理 path/错误结构的兼容转换，但本 spec 不将「字符串路径兼容 RHF」视为核心契约。

- **FR-007 · StateTrait.source 与 Resource/Query 复用约束（表单异步约束）**  
  规范 MUST 要求所有「字段/表单语义」层面的异步行为（例如根据供应商编码拉取供应商信息、根据远程配置约束下拉选项）统一通过 **Resource/Query + kernel source** 表达：  
  - 异步依赖只能以 `StateTrait.source`（或 list.item/list.source 的等价 kernel 形式）声明「哪个字段依赖哪个逻辑资源、key 如何从 state/row/rows 推导」；  
  - 资源结果如何影响表单视图（值/错误/meta/options）必须通过 `computed/check` 派生完成，保持单向数据流与事务可回放；  
  - Trait 侧 **不得直接返回或嵌入任意 Effect/IO**。所有真实 IO 必须收敛在统一的 Resource 事实源（`ResourceSpec.load: Effect`）中，由 Runtime/Middleware 触发与接管；  
  - 资源本身的定义（包括访问方式、错误模型等）必须在 Resource 事实源中集中管理并以 Layer 注入 Runtime，而不是在表单 Trait 层定义「影子资源」。

- **FR-008 · Resource 组织与作用域的最佳实践指引**  
  规范 MUST 对「资源如何在项目中组织与注入」给出清晰的最佳实践约束，并要求在用户文档中以专门章节形式呈现，包括但不限于：  
  - 推荐按照领域（如供应商、合同、结算）集中定义 Resource，而不是按页面/模块零散分布；  
  - 推荐在应用级或特性级 Layer 中组合 ResourceLayer，并在 Runtime.make 的 layer 中统一注入；允许在 ModuleImpl.imports 中挂载局部 ResourceLayer，但必须避免在同一 Runtime 作用域内用不同实现重复注册同一 resourceId；  
  - 明确「同一 Runtime 作用域内 resourceId 不能冲突，跨 Runtime 作用域可以为同一 id 提供不同实现」的约束，并在文档中给出典型用法与误用示例（如多租户、分环境配置）。

- **FR-009 · Rules 语法糖与内置校验库（对标 RHF rules，基于 check）**  
  在 kernel 的 `check` 槽位之上，规范 SHOULD 提供一层面向日常开发的规则组合语法糖（Rules API），以便在不改变 IR 的前提下显著提升表单校验的表达力与复用性：  
  - Rules API 只保留一个规范入口：`Form.Rule.make<V>(config)`，根据使用位置自动推断为 Field / item / list / root 级校验，并编译为等价的 `check(input, ctx)` 函数；  
  - 内置规则能力 MUST 覆盖 RHF `rules` 的核心集合（`required`、`min`/`max`、`minLength`/`maxLength`、`pattern`、以及命名的多条自定义 validate 规则）；  
  - Rules 允许组合已有 RuleSet（compose / pipe / merge）以便在不同表单/模块间复用相同的校验与联动逻辑；  
  - Rules 输出始终是 IR 层统一的 `check` 函数（本质为写 errors 子树的 computed），StateTrait / Runtime / Devtools 只感知 `check`，不直接依赖具体 Rule 配置结构。

- **FR-010 · effect/Schema 集成与字段名映射（Form ↔ 后端模型边界）**  
  为了在保证后端模型层 SSOT 与后端接口一致的前提下，仍然让 FormView / 表单领域糖保持良好的表达力与命名自由度，本规范对 effect/Schema 集成提出如下要求：  
  - Form 层以 FormView 模型为主（字段名与结构面向 UI/交互友好，例如 `supplierCode`、`languages[].type`），后端模型层以后端模型为主（字段名与结构对齐后端接口或领域模型，例如 `supplier_code`、`language_type_code`）；  
  - 两者之间推荐通过 `Schema.transform` 风格的双向转换 Schema（FormViewSchema ↔ DomainSchema）完成字段名与结构的映射：  
    - 提交前：先将 FormState 通过 transformer/Schema 解码为后端输入模型，再由 Resource/HTTP 客户端发往后端；  
    - 回填时：将后端返回的后端输出模型通过 transformer/Schema 编码为 FormViewState，避免在 Form 层散落手写字段名映射逻辑；  
  - 深度业务校验（跨字段、跨结构、跨版本的强约束）应优先由后端模型 Schema 的 decode 流程承担，Form Rules 则侧重于输入体验与即时反馈；  
  - 当后端模型 Schema decode 失败时，规范 MUST 提供“将 Schema 解码错误映射为 Form ErrorTree”的规则（可通过 helper/适配层实现），从而把提交期错误以与 Rules 一致的结构写回 `state.errors`（必要时允许落到 `errors.$form` 或 `errors.<fieldPath>`）；  
  - 规范 MAY 提供从 Schema 派生基础 Rules 的 helper（例如 `Form.Rule.fromSchema(schema, "amount")`），但不强制要求所有表单规则都回写到 Schema，中短期内允许存在纯 UI 级的 Rules；  
  - 无论是否使用 Schema，Form 层最终暴露给 StateTrait / Runtime 的仍然是统一的 `check` 函数与错误树结构（本质为写 errors 子树的 computed），Schema/transformer 只在 Form ↔ 后端模型边界与深度校验路径出现。

- **FR-011 · 根级 check 槽位（跨字段 / 跨列表规则）**  
  为了承载跨字段、跨列表甚至跨 Section 的纯校验逻辑，本规范要求支持可选的「根级 check」：  
  - 根级 check 直接面对**整份 Module/State**，签名为 `(state: Readonly<S>, ctx: FormCtx<S>) => GlobalErrorTree<S>`，并以 `StateTrait.check` 的形式写入 `errors` 子树（具体 error path 由实现层约定，例如 `errors.$form`）；  
  - 根级 check 允许读取与校验蓝图中未显式声明的字段，返回的 GlobalErrorTree 也允许对任意 path 写入错误 patch（不仅限于 lists 子树），以满足真实 ToB 场景的跨域约束；  
  - 根级 check MUST 保持纯粹的「状态 → 错误树 patch」语义，不得在其中直接触发副作用或执行 IO；涉及异步校验与副作用的跨表单逻辑由 Logic/Flow + Resource 承担；  
  - Rules API SHOULD 支持在 root 位置直接使用 `Form.Rule.make(config)` 生成等价 check。

- **FR-012 · 校验规则的归属与组织（root vs local）**  
  为了降低心智负担并提升可维护性，规范 MUST 在用户文档中给出明确的组织建议，并在示例中贯彻：  
  - root check 与 local check（字段级 / item / list）**同时允许**，并且语义等价地回落到 kernel `check`；  
  - 默认 SHOULD 优先使用 local check：当错误主要归属到某个字段/某个列表（或某一行）时，把 check 挂在该域下；  
  - root check SHOULD 仅用于“跨域不变量”：需要同时对多个字段/多个列表写入错误，或更适合在一个地方集中表达的整表规则；  
  - 文档 MUST 提供同一类规则在两种位置的等价写法对照，并解释取舍（可读性/复用性/定位成本）。

- **FR-013 · 命名规则集合（check/computed 的 Record 形态）**  
  为了提升规则可读性、复用性与 Devtools 可还原性，kernel MUST 支持在 `check/computed` 上声明**命名规则集合**：  
  - `check` / `computed` 允许写成单函数或 `Record<ruleName, fn>` 两种形态；单函数是语法糖（内部等价为一个默认 ruleName）；  
  - 当使用 Record 形态时，Devtools / Studio MUST 能显示 ruleName，并在错误树 leaf 为 Record 时与 ruleName 对齐；  
  - 规则名称仅用于诊断、展示与组合，不改变运行时语义；底层仍回落为一组 kernel  Entry。

- **FR-014 · 命名规则的顺序与合并语义（确定性 deep‑merge）**  
  当 `check/computed` 使用 Record 形态声明多条命名规则时，kernel MUST 提供确定性的执行与合并语义：  
  - 执行顺序固定为 `ruleName` 字典序（与对象字面量书写顺序无关），保证全双工可重放与可对比；  
  - 每条规则返回的 patch 在同一事务内按顺序做 deep‑merge：  
    - 对 `check`：同一路径的 leaf 若来自多条规则，最终合并为 `Record<ruleName, message>`（同名覆盖）；  
    - 对 `computed`：同一路径 leaf 冲突时 last‑writer‑wins，并在 dev 环境产生结构化 warning 便于定位；  
  - 合并语义不得引入非确定性（如依赖运行时遍历顺序）；  
  - Devtools MUST 能还原每条命名规则的输出与最终合并结果（至少在 debug 视图中可追溯）。

- **FR-015 · Form 场景 source 的默认触发（onValueChange + debounce + 事件扩展）**  
  为了让“输入变化 → 资源约束变化”的表单链路足够甜且可演进，规范 MUST 满足：  
  - kernel `StateTrait.source` 默认保持“只显式 refresh”（避免资源风暴）；  
  - Form.traits（领域糖）中声明的 source 默认启用自动触发，默认 `triggers: ["onMount", "onValueChange"]`：  
    - `onMount` 用于“编辑/回填”场景：初始 state 已有有效 key 时，自动触发一次 refresh；  
    - `onValueChange` 用于“输入变化”场景：当 keySelector 推导得到的 key 发生变化时触发 refresh（实现层可做 key 去重）；  
  - `triggers: ["manual"]` 表示“仅显式 refresh”，并且 MUST 与其它 trigger 互斥（不得出现 `["manual", ...]`）；  
  - 可选配置 `debounceMs`：默认仅对 `onValueChange` 生效（onMount 不需要防抖）；  
  - keySelector 允许返回 undefined 表示“当前无有效 key / 禁用”：此时不得触发 IO，并将 snapshot 置为 `{ status: "idle" }`（该禁用语义是 kernel 的通用能力，不仅限于 Form.traits）；  
  - triggers 的命名以用户心智为主（`onValueChange`），不在对外文档中强调“key change”；  
  - 预留 `triggers: ["onBlur"]`（以及未来更多 UI 事件）的扩展位：本轮不强制实现自动 wiring，但用户文档必须给出在 @logix/react 中如何在 blur/submit 等事件上触发 refresh 的推荐模式（通过显式调用 refresh 或等价 helper）。

- **FR-016 · source 的写回形态（ResourceSnapshot）**  
  为了让表单链路在不引入额外 ad-hoc 状态的前提下具备 loading/error 心智，本规范要求：  
  - `source` 的目标字段写回值 MUST 是 `ResourceSnapshot`，而不是 raw data；  
  - `ResourceSnapshot` 至少包含 `status`（`idle/loading/success/error`）、`key`（与 ResourceSpec.keySchema 对齐）以及 `data/error`（按 status 分支可选）；  
  - `computed/check` 可基于 snapshot 派生 options、disabled、错误提示等 UI 友好字段；  
  - Devtools MUST 能将 source 的刷新过程体现在 Timeline（进入 loading、成功/失败落盘）与 StateTraitGraph（字段依赖）中。

- **FR-017 · source 的竞态处理（丢弃 stale 结果）**  
  为了避免表单输入高频变化时出现“旧 key 覆盖新 key”的错乱状态，本规范要求：  
  - 当某次 refresh 开始时，运行时 MUST 先用 `ResourceSpec.keySchema` 规范化 key，并计算稳定 `keyHash`；进入 `{ status: "loading", key }`（对外只要求保留 key，但所有比较必须基于 keyHash）；  
  - 当请求返回 success/error 时，在写回 snapshot 前必须重新计算当前 keySelector 的结果：  
    - 若当前 keyHash 与本次请求 keyHash 不相等，则视为 stale 结果，必须忽略（不得覆盖当前 snapshot）；  
    - 仅当 key 相等时才允许写回 `{ status: "success"/"error", key, data/error }`；  
  - Devtools SHOULD 能看见 stale 结果被丢弃的诊断信息（至少在 dev 环境下可观测）。

- **FR-018 · source 的并发策略（switch / exhaust，默认 switch）**  
  为了在“表单输入高频变化”与“资源请求成本/限流”之间提供可控取舍，本规范要求：  
  - 每个 `source` 规则 MAY 声明 `concurrency: "switch" | "exhaust"`，默认 MUST 为 `"switch"`；  
  - `switch` 语义：以“最新 key”为准；当同一 source 在前一次请求仍 in-flight 时触发了新的 refresh，运行时 SHOULD 尽量取消旧 in-flight（若底层不支持取消也不强求），但无论是否取消都 MUST 按 FR-017 丢弃 stale 结果，确保不会“旧 key 覆盖新 key”；  
  - `exhaust` 语义：同一 source 同时最多一个 in-flight；in-flight 期间的 refresh 触发 MUST 被抑制，但运行时 MUST 记录一次 trailing refresh（只保留最后一次），当前请求结束后自动补发一次“最新 key”的 refresh（同样必须按 FR-017 做 stale 丢弃）；  
  - Devtools SHOULD 能观测到被抑制/合并的 refresh（至少在 dev 环境显示计数或事件），保证全双工可回放与可解释。

- **FR-019 · ResourceRef（resource id 的领域常量 + 蓝图元信息，不影响语义）**  
  为了让 Module/Traits 在保持“只依赖 resourceId + key”边界清晰的同时，仍能具备更好的可读性、可诊断性与可生成性，本规范要求：  
  - `source.resource` 在 DSL/领域糖层 MAY 接受 `string | ResourceRef`，其中 `ResourceRef` 为纯数据对象：`{ id: string; meta?: ResourceMetaHint }`；  
  - build 阶段 MUST 归一化为 `resourceId: string`（取 `resource` 的 string 或 `.id`），并且 Program/Plan/EffectOp 中只存 string resourceId，确保运行时事实源稳定；  
  - `ResourceRef.meta` 仅用于 Devtools/文档/代码生成，且 MUST 为白名单字段集合（`label/description/tags/owner/docUrl`）；不得改变运行时执行语义（不得承载 cache/retry/concurrency 等语义字段）；  
  - Devtools/诊断展示资源信息时，`ResourceRef.meta` 优先；缺失字段再 fallback 到 `ResourceSpec.meta` 的同名字段（例如 description）。该合并只用于展示，不得反向影响任何运行时语义；  
  - 当 `ResourceRef.meta` 与 `ResourceSpec.meta` 的同名展示字段（例如 description）同时存在且值不一致时，dev 环境 SHOULD 给出 warning（按 resourceId+字段去重），提示“展示元信息分叉”；展示仍遵循“ResourceRef 优先、缺失再 fallback”；  
  - `ResourceRef.meta.tags` 的语义为展示侧的“分类标签”，用于 Devtools 的过滤/分组/检索；tags 不影响执行语义。Devtools 在展示与索引时 SHOULD 对 tags 做去重与字典序排序，保证稳定可对比；  
  - 用户文档 SHOULD 给出推荐工程组织：Traits/Module 图纸层优先依赖 `resources/*.id.ts`（只导出 ResourceRef 常量），Runtime/实现层在 `resources/*.spec.ts` 中用 `Resource.make({ id: ResourceRef.id, ... })` 定义并通过 `Resource.layer([...])` 注入；以降低 bundle/循环依赖风险。  
    但该拆分不作为强制约束：允许在小项目或局部场景把 ResourceRef 与 ResourceSpec 放在同一个文件里。

- **FR-020 · Form UI 交互态的全双工落点（state.ui）**  
  为了让表单在真实业务中具备可回放、可调试、可生成的“全过程”，规范 MUST 支持把表单交互态纳入全双工链路：  
  - 表单交互态（touched/dirty/blur/focus/unregister/submitCount 等）SHOULD 存放在 Module state 的专用子树中（推荐 `state.ui`）；  
  - `@logix/form` MUST 提供把 UI 事件映射为领域事件并写入 `state.ui` 的标准方式（action/reducer/logic 皆可），而不是在 React 组件本地维护第二套不可回放的事实源；  
  - Devtools/TimeTravel MUST 能回放 `state.ui` 的演进（至少与 `state.errors` 同等可观测），以支持“滚动到首错”“复现输入轨迹”等调试能力。

- **FR-021 · TraitLifecycle：Trait 与上层领域的标准桥接 API（FieldRef + scoped validate + cleanup）**  
  为了让上层（`@logix/form` / `@logix/react` / 未来更多 `xxxTrait`）能以最小 glue 实现 RHF 级体验，Trait kernel MUST 提供可组合的桥接能力（本 spec 暂称 `TraitLifecycle`）：  
  - 必须存在一种可序列化的 FieldRef/FieldKey，能够唯一定位一个字段实例（至少包含 field path + listIndexPath/index 等数组定位信息），用于表达 blur/change/unregister/scroll-to-error 等目标；  
  - 必须支持对 `check` 的**局部**执行（scoped validate）：允许仅校验某个字段/某行/某个列表，或按策略触发（如 onSubmit 全量、onBlur 局部），而不是只能全量跑；  
  - 必须定义 unregister / 行删除 / 重排时的错误与资源清理语义：对应 scope 的 `errors` 子树必须被确定性清理；对应 source 需遵守 stale 丢弃/取消/回 idle 语义，避免“删行后请求回写到幽灵字段”。

### Kernel IR 核心原语（computed/source/link/check + node/list 组合子）

> 本小节只定义「IR 级别的唯一主线」，不锁死 TypeScript 具体 API 形态，方便 full‑duplex：  
> 从需求/spec 生成代码，以及从代码/Devtools 反向还原 spec 时，都以同一套 kernel 概念对齐。

**0. 运行时主线不变：只有三种运行时 kind（computed/source/link）**

本 spec 的“表单数组能力”仍然只有一条运行时主线：`computed / source / link`。  
其中：

- `computed`：纯派生（写入某个具体目标字段的值）；  
- `source`：声明资源依赖与 key 规则，真实 IO 在 ResourceSpec.load 中；  
- `link`：跨字段传播（把 from 字段的值写入某个目标字段）。  

`check` 是语义糖：本质是“写 `state.errors` 同构错误树”的 computed，不引入新的运行时 kind。

**1. StateTrait.node：统一 DSL 形状（纯编译期组合子）**

为了让「标量字段 / 数组字段 / 根级规则」共享同一套声明形状，本 spec 引入 `StateTrait.node(...)`：

- node 只是一种 DSL 组合子：用于把某个作用域上的 `computed/check/source/link` 以同一种结构组织起来；  
- build 阶段必须把 node 展开为等价的 kernel entries（computed/source/link，以及写 errors 的 check），Runtime/Devtools 只感知展开后的 kernel；
- node 中的 `computed` **不得返回任意 patch**：每条 computed 必须对应一个明确的目标字段，并产出该字段的值；每个目标字段下允许单函数或命名规则集合（Record 形态，便于 Devtools 展示与确定性合并）。

**2. 标量/对象字段：node 直接挂在字段路径上**

```text
StateTrait.from(StateSchema)({
  "profile.email": StateTrait.node({
    check: {
      required: (email) => (email ? undefined : "必填"),
      format:   (email) => (/^\S+@\S+$/.test(email) ? undefined : "邮箱格式不正确"),
    },
    // 可选：source/link/computed 同理
  }),
})
```

约定：

- 字段级 node 的 check 输出会被写入 `state.errors` 的同构叶子：这里是 `errors.profile.email`；无错误返回 `undefined`；  
- 命名规则集合（Record 形态）仍然按 `ruleName` 字典序做确定性合并（见 FR-014）。

**3. 数组字段：StateTrait.list + item/list 两个 scope**

对任意数组字段 `path = "items"`，通过 `StateTrait.list({ item, list })` 一等公民化数组语义：

```text
items: StateTrait.list({
  item: StateTrait.node({
    computed: { /* 行级派生：按字段产值 */ },
    check:    { /* 行内/行级校验：写 errors.items[i].x / errors.items[i].$item */ },
    source:   { /* 行级资源依赖：写回 ResourceSnapshot */ },
    link:     { /* 行内联动 */ },
  }),

  list: StateTrait.node({
    check: { /* 跨行/列表级校验：写 errors.items.$list 或写多行错误 */ },
    // computed/source/link 允许但应谨慎：多数“列表级 meta”建议写在独立的 meta 字段上（非 list 内 patch）
  }),
})
```

语义：

- `item`：面对单个数组元素（行/子字段域）；ctx 至少包含 `state / path / index`（实现层可额外提供 items/prev/next）；  
- `list`：面对整个列表（跨行/全局）；ctx 至少包含 `state / path`；  
- list/node 都是 DSL 组合子：build 阶段会把其内容展开为等价的 kernel entries（主要落在 `items[]` 与 `items[].field` 级路径上），不引入第二套 runtime。

**4. 根级规则：$root**

为了承载跨字段/跨列表的整表不变量，允许在 traits spec 中声明一个保留键 `$root`：

```text
$root: StateTrait.node({
  check: (state, ctx) => ({ $form: "..." }),
})
```

约定：

- `$root` 的 check 面向整份 state；错误写入 `errors.$form`（或更细的全局错误子树），仍然是纯“状态 → 错误树 patch”，不得触发 IO。

**5. 与全双工 / SDD 的关系**

- Spec 写作层：只需要声明「字段/列表/root 的 node 里有哪些 computed/check/source/link」，不关心具体语言实现；  
- 代码生成层：可以机械地将 node/list 结构映射为 `StateTrait.node` / `StateTrait.list({ item, list })`（或可选的 Form.traits 领域糖）调用，保持 IR 等价；  
- Devtools 层：按「字段/列表 → node → computed/check/source/link」展开 TraitGraph，使人类与 LLM 都能从运行时状态反向还原 spec 中的意图。

### Key Entities *(include if feature involves data)*

- **数组字段（Array Field / FieldArray）**  
  - 表示 State 中的数组类型字段，如订单行列表、教育经历列表；
  - 需要在 SSoT 中明确其路径模型（到数组本身、数组元素、元素内子字段）。

- **数组元素 Trait（Array Element Trait）**  
  - 作用于某个数组元素及其子字段的 Trait 抽象；
  - 可用于描述 per-item 的计算、联动与校验行为；
  - 与当前 StateTrait 的 computed/source/link 语义保持兼容。

- **错误模型（Error Model for Arrays）**  
  - 描述数组字段及其元素的错误结构；
  - 需支持行级错误、字段级错误和整体列表错误；
  - 与 UI 组件的错误展示结构（如 RHF 中的 `errors.items[3].name`）存在明确映射关系。

- **字段定位（FieldRef / ListRef）**  
  - 用于唯一定位一个“字段实例”（而不仅是字段路径字符串），是 `@logix/form` / `@logix/react` 与 Runtime/StateTrait 的桥接货币；
  - 必须可序列化、可比较：至少包含字段 path，以及数组场景下的 `listIndexPath + index` 等定位信息；
  - 用于表达 blur/change/unregister、滚动到首错、以及 scoped validate 的 target。

- **校验请求（ValidateRequest）**  
  - 表示一次“局部/全量校验触发”的输入（mode + target）；
  - 支撑 RHF 级体验：submit 全量、blur 局部、valueChange 局部复校验；
  - 执行范围必须由 Graph/Plan 推导（只运行可能影响 target 的 check），避免全量校验的性能陷阱。

- **表单交互态（Form UI State / `state.ui`）**  
  - 表示 touched/dirty/submitCount 等交互态，属于全双工可回放链路；
  - 推荐以与 FormView 值结构同构的布尔树表达（字段=字段、数组=数组），不引入 `$list/$item`；
  - 由 `@logix/form` 维护写入，Devtools/TimeTravel 可回放，用于驱动“何时展示错误/何时触发校验”的策略。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 · 覆盖典型 RHF 场景**  
  给出至少 3 个来自 RHF 文档或内部实践的典型 FieldArray 场景（如「动态教育经历列表」「订单行 + 折扣」「多级嵌套地址表单」），经小组评审确认，本 spec 中定义的 StateTrait 数组模型在概念上可以一一覆盖这些场景，无需引入额外的 ad-hoc 状态。评审结果需记录在 spec 旁的 notes 中。

- **SC-002 · 文档可理解性**  
  对 3 名未参与本 spec 编写的前端/架构工程师进行阅读测试：  
  - 要求他们在 30 分钟内阅读本 spec 和相关 SSoT 章节；  
  - 然后独立画出「某个复杂表单的 StateSchema + TraitSpec 草图」；  
  - 若至少 2 人的草图与预期模型高度一致（只存在细节差异），则视为通过。

- **SC-003 · 迁移指导有效性**  
  选取一个现有 RHF 表单（含 FieldArray）作为样本，用本 spec 提供的模型和指南重写一版「Logix + StateTrait」设计文档：  
  - 由原项目维护者评估：是否能在 1 个工作日内根据该文档完成 PoC 实现；  
  - 若评估结果为「可以」，且在 PoC 中未出现本 spec 未覆盖的核心概念，则视为满足。

- **SC-004 · 设计一致性约束**  
  在本 spec 落地后 1 个月内，审查新增/修改的与表单数组相关的设计/实现：  
  - 不再出现新的、与本 spec 相冲突的数组路径 / 错误模型设计；  
  - 所有新引入的数组 Trait 场景要么明确引用本 spec 概念，要么在本 spec notes 中登记「计划中的偏离/扩展」。  
  如检查结果中出现未对齐的实现，需回到本 spec 做增补或更正。
