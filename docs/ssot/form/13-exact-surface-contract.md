---
title: Form Exact Surface Contract
status: living
version: 22
---

# Form Exact Surface Contract

## 目标

冻结 Form 最终用户 contract 的 exact spelling。当前 freeze 只承认 Form 领域 DSL 与 effectful domain handle；React host law 与 pure projection law 由 core runtime 持有。

这页在 supporting routing law 下只承接：

- Form-owned exact carrier
- Form-owned exact surface
- Form-owned selector primitive

## 页面角色

- 本页是 Form 最终用户 contract 的唯一 exact authority
- 本页只写 surviving public surface
- route-level boundary 继续看 [05-public-api-families.md](./05-public-api-families.md)
- React exact host law 继续看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- 当前覆盖矩阵的全局 frozen shape 继续看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)
- primitive-first reopen gate 继续看 [09-operator-slot-design.md](./09-operator-slot-design.md)

## 当前总判断

- Form 是 Logix logic complement spine 上的 input-state domain kit
- `Form.make` 只作为领域构造 act 存在，必须可还原到同一条 core assembly law
- `FormProgram` 只作为 core `Program` 的领域 refinement 理解
- Form 只拥有 domain DSL 与 effectful domain handle
- React host acquisition 与 pure projection 继续由 core-owned host law 承接

## adopted candidate

本轮 adopted candidate 已冻结为：

- `SYN-17 core-first contract contraction`

冻结结果如下：

- `@logixjs/form` root 只保留：
  - `Form.make`
  - `Form.Rule`
  - `Form.Error`
  - `Form.Companion`
- `./locales` 继续保留，但只作为 optional plain locale asset subpath
- `Form.Path`
- `Form.SchemaPathMapping`
- `Form.SchemaErrorMapping`

这 3 项全部退出 public root。

## exact root surface

当前 surviving root exports 只保留：

- `Form.make`
- `Form.Rule`
- `Form.Error`
- `Form.Companion`

`Form.Companion` 当前只冻结为 root-visible、form-owned 的 data-support namespace / selector primitive family。
它不新增第三 route、一级 owner lane 或 truth owner。
companion semantics 的唯一 authoring act 与 truth origin 继续固定在 `field(path).companion({ deps, lower })`。

## exact error carrier contract

当前 exact 错误 carrier 固定为：

```ts
type FormErrorLeaf = {
  origin: "rule" | "decode" | "manual" | "submit"
  severity: "error" | "warning"
  code?: string
  message: I18nMessageToken
}
```

冻结规则：

- cross-source error 只承认 `FormErrorLeaf`
- rendered string 不进入 carrier
- raw string / `unknown` error 不进入 surviving public surface
- `severity: "warning"` 是 advisory leaf，不计入 submit blocking `errorCount`，不让 `submitAttempt.blockingBasis` 变成 `error`
- `Form.Rule` 继续只声明 locale-neutral token
- `decode` 继续只走 `Form.SchemaErrorMapping`
- manual 写入继续只接受已成形 `FormErrorLeaf`
- submit 后服务端错误继续只走显式 submit error mapper

## exact builtin rule message corollary

对 builtin rule message，当前同时冻结下面这些 corollary：

- builtin default message 一律按 `I18nMessageToken` 理解
- builtin `message` override 在已冻结 allowlist 上允许 raw string authoring input，但 normalize 后继续按 `I18nMessageToken` 理解
- builtin 一旦具备默认 token，canonical day-one 写法默认零参数
- 只有在需要 override 默认文案时，才显式传 `message: token(...)`
- 当前 builtin family 至少包括：`required / email / minLength / maxLength / min / max / pattern`
- `required` 允许 bare token shorthand
- `minLength / maxLength / min / max / pattern` 的 override 一律走 object 形态
- `@logixjs/form` 若提供 builtin default locale catalogs，它们只允许停在 optional `@logixjs/form/locales` 路径
- `@logixjs/form/locales` 在 exact authority 中只承接 plain locale assets
- `@logixjs/form/locales` 不承接 registration、merge order、bucket mapping、render 或 helper policy
- locale catalog 的 registration、merge order 与 bucket mapping owner，继续看 [../runtime/08-domain-packages.md](../runtime/08-domain-packages.md)
- 当前 freeze 不把公共 canonical carrier 升成 `I18nMessageToken | I18nLiteralToken`
- 面向 non-i18n 项目的 raw string sugar，当前只允许停在窄 authoring edge，不得把 raw string 或 literal variant 直接抬成 Form 公开 carrier
- v1 raw string sugar 已实施，允许位置只包括：
  - 显式 `message` slot
  - `Form.Rule.make` 的 `required / email` shorthand
- direct builder 当前不开放 bare string positional shorthand
- raw string 只在 Form builtin authoring input 这一瞬合法
- normalize 只发生在 Form authoring edge
- raw string 不越过 builtin parser 边界
- 一旦形成 rule declaration、normalized builtin config、runtime error leaf、reason evidence、compare input 或 diagnostics 输入，看到的都必须已经是 i18n-owned 的非 string 结构
- 教学顺序继续固定为：
  - 零参数 builtin
  - token override
  - raw string sugar

## exact residue boundary

下面这些对象若仍存在于代码、barrel、测试或迁移材料，只能视为 residue / cutover debt；它们不属于最终用户 contract：

- `Form.from`
- `Form.commands`
- `FormView`
- `FormFrom`
- `FormLogicSpec`
- `Rules*`
- `@logixjs/form/react`

## exact type surface

当前 surviving public types 只保留：

- `FormProgram<Id, TValues, TDecoded = TValues, TCompanionMetadata = {}>`
- `FormState<TValues>`
- `FormErrorLeaf`
- `FormHandle<TValues, TDecoded = TValues>`
- `SubmitVerdict<TDecoded>`
- `SourceReceipt<Data = unknown, Err = unknown>`
- `AvailabilityFact`
- `CandidateSet<Item = unknown>`
- `CompanionBundle`
- `CompanionLowerContext<TValues, P, Deps>`
- `CompanionDepsMap<TValues, Deps>`
- `CanonicalDepValue<TValues, P>`

其中：

- `FormProgram` 是唯一公开组合单元
- `FormProgram` 继续按 core `Program` 的领域 refinement 理解
- `TCompanionMetadata` 只作为 type-only phantom carrier，用于把已返回的 companion declaration metadata 传给 `Form.Companion.* -> useSelector`；它不对应 runtime public object，不开放 public metadata map authoring
- `SourceReceipt` 只作为 type-only source snapshot shape 存在，用于 `CompanionLowerContext.source?` 与用户字段值类型表达
- `SourceReceipt` 不承接 public authoring noun、runtime identity API、read helper 或 evidence coordinate owner
- companion 相关类型全部只作为 type-only authoring contract 存在
- 这些 companion 类型不增加 runtime root value，不增加 read helper，不增加第二 route

## exact state truth

Form pure projection 消费的 canonical state truth 固定为：

```ts
type FormState<TValues extends object> = TValues & {
  errors: unknown
  ui: unknown
  $form: {
    submitCount: number
    isSubmitting: boolean
    isDirty: boolean
    errorCount: number
    submitAttempt: {
      seq: number
      reasonSlotId: string
      verdict: "idle" | "ok" | "blocked"
      decodedVerdict: "not-run" | "valid" | "invalid"
      blockingBasis: "none" | "error" | "decode" | "pending"
      errorCount: number
      pendingCount: number
      summary: unknown
      compareFeed: unknown
    }
  }
}
```

Form 不再额外定义第二套 pure projection family。
host 继续通过 core selector law 消费这份 state truth。
`submitAttempt` 当前只冻结为最小 summary / compare feed 观察面，不等于第二 submit API。
companion 的 runtime writeback 当前允许落在 internal `ui` 子树，但 internal read carrier noun 与 exact landing path 继续 deferred，不构成当前 exact authority。公开读侧 primitive 只认下文冻结的 `Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)`。

## exact composition law

当前 exact freeze 只承认一条公开组合律：

- `Form.make(...)` 返回 `FormProgram`
- `FormProgram` 进入 imports、runtime tree 与 host acquisition 时，继续服从 core `Program` law
- Form 不拥有第二 assembly law、第二 composition law 或第二 host truth

## exact authoring act

```ts
Form.make<
  Id extends string,
  TValues extends object,
  TDecoded = TValues,
  TDefineReturn = void,
>(
  id: Id,
  config: {
    values: Schema.Schema<TValues>
    initialValues: TValues
    validateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
    reValidateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
    debounceMs?: number
  },
  define?: (form: {
    rules(...decls: ReadonlyArray<unknown>): void
    field(path: string): {
      rule(rule: unknown, options?: { errorTarget?: "$value" | "$self" }): void
      source(config: {
        resource: unknown
        deps: ReadonlyArray<string>
        key: (...depsValues: ReadonlyArray<unknown>) => unknown | undefined
        triggers?: ReadonlyArray<"onMount" | "onKeyChange">
        debounceMs?: number
        concurrency?: "switch" | "exhaust-trailing"
        submitImpact?: "block" | "observe"
      }): void
      companion(config: {
        deps: ReadonlyArray<string>
        lower(ctx: CompanionLowerContext<...>): CompanionBundle | undefined
      }): type-only companion metadata carrier
    }
    root(rule: unknown): void
    list(path: string, spec: unknown): void
    readonly dsl: unknown
    submit(config?: {
      decode?: Schema.Schema<TDecoded>
    }): void
  }) => TDefineReturn,
): FormProgram<Id, TValues, TDecoded, CompanionMetadataFromDefineReturn<TDefineReturn>>
```

这里冻结的是：

- 单一 exact authoring act
- 位置参数 declaration slot
- day-one surviving DSL path：`rules`、`field(...).rule`、`field(...).source`、`field(...).companion`、`submit`
- `root` / `list` 只作为同一 act 内的高级 helper
- `dsl` 只作为同一 act 内的 advanced declaration helper，不构成第二 authoring carrier
- `Form.make` 只承接领域 DSL，不额外定义第二组合律
- implementation-first 只允许在这条 act 之下细化 scheduling、submit evidence ownership、cleanup receipt 与 trial artifact export
- `field(path).companion(...)` 当前可返回 type-only metadata carrier；只有当该 carrier 被 `define` callback 返回时，TypeScript 才能 soundly 将 exact lower-result metadata 编入 `FormProgram`
- 多个 companion 需要 exact typing 时，`define` callback 返回 carrier tuple，例如 `return [countryCarrier, warehouseCarrier] as const`
- imperative `void` callback 写法继续有效，但只作为 runtime authoring 写法；它当前不能自动收集 exact companion metadata，selector result 应诚实降级为 `unknown`
- exact typing 教学口径固定为 returned-carrier，不再把 void callback auto-collection 当作当前 implementation blocker

当前对 `config / define` 的职责边界再固定一层审计规则：

- `config` 只承接静态 schema、initial values、validation mode、debounce 一类 declarative setup
- `define(form)` 只承接领域声明：field / root / list / submit / dsl
- 若某个能力会把 declaration semantics、owner truth 或第二 authoring route 塞回 `config`，直接视为第二 declaration carrier
- 若某个 convenience 提案只是为了少写几行，却让 `config` 与 `define` 的职责重新混写，默认拒绝

## exact local remote dependency declaration

当前 final exact user-view 只冻结一种 local remote dependency 形状：

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

列表项继续沿用同一 exact shape：

```ts
$.field("items.profileResource").source({
  resource: RowProfile,
  deps: ["items.profileId"],
  key: (profileId) => profileId ? { profileId } : undefined,
})
```

## exact local soft fact declaration

当前 final exact user-view 同时冻结一条字段侧本地 soft fact declaration：

```ts
$.field("warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: unknown,
      candidates: unknown,
    }
  },
})
```

这里冻结的是：

- `field(path).companion({ deps, lower })` 这条 exact act
- `lower(ctx)` 的最小 authority：`value / deps / source?`
- `clear | bundle` 的 owner-local atomic semantics
- day-one slot inventory 只认 `availability / candidates`

这里继续 deferred 的是：

- internal read carrier noun
- exact `ui` landing path
- helper family noun beyond frozen selector primitive

type-only contract 当前固定：

- `CompanionLowerContext` 的 `value` 随 `field(path)` 推导
- `CompanionLowerContext` 的 `deps` 随 `deps` tuple 推导；数组路径按聚合读值推导，例如 `items.warehouseId` 推为 `ReadonlyArray<string>`
- `CompanionLowerContext` 的 `source?` 按 `SourceReceipt` 结构表达；若字段值本身是 source receipt，则保留其 data/error 类型
- `AvailabilityFact` 至少要求 `kind: "interactive" | "hidden" | "disabled"`
- `CandidateSet<Item>` 至少要求 `items: ReadonlyArray<Item>`，并允许 `keepCurrent` 与最小 `project` 投影

companion selector exact result typing 当前补入一条 authority writeback：

- `Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)` 的 exact lower-result inference 可以继续推进，但只能通过 Form-owned type-only declaration metadata carrier 完成
- metadata source 必须来自同一条 `field(path).companion({ deps, lower })` authoring act
- metadata carrier 可以作为 phantom type 经过 `FormProgram -> handle -> Form.Companion.* -> useSelector` 传递
- 当前 `Form.make(..., ($) => { ... })` 的 `void` callback 形态本身不足以 soundly 收集 exact `lower` return type
- 若实现需要改变 `define` callback 的 TypeScript 返回类型、增加 declaration accumulator，或扩展 `FormProgram` 类型参数，必须保持 runtime public object 不变，并继续回到本页同步 exact signature
- 不允许把 public `FormProgram.metadata`、public `Form.Path`、schema path builder、typed descriptor namespace、manual generic truth 或第二 hook family 作为该问题的默认解

companion deps 语义当前固定为：

- `deps` 是唯一依赖 authority
- 普通字段 deps 按字段值读取
- list item 字段 deps 按 canonical path 聚合读取；例如 `items.warehouseId` 在 `lower(ctx)` 内是 `ReadonlyArray<string>`
- 这不同于 `source(...)` 的 row-local key deps。`source(...)` 继续只允许同一 row scope deps；`companion(...)` 可以读取 whole-root 聚合 soft fact，用于候选集和可用性整形
- 这条差异必须留在 Form declaration contract 内解释，不得在 host / selector / demo 层补第二解释器

companion lower 预算当前固定为：

- `lower` 必须同步、纯计算、无 IO
- `lower` 只承载轻量 bundle
- 大候选集、远程过滤、异步搜索或重投影必须留给 `source` / Query owner 或后续受控 reopen，不得塞进 eager companion state writeback

冻结规则：

- noun 固定为 `source`
- attachment 固定为 `field(path)`
- `resource` 必须来自 Query owner，例如 `Query.Engine.Resource.make(...)` 的结果
- `deps` 继续是唯一依赖 authority
- `key` 继续按 deps-as-args 理解；返回 `undefined` 等于 inactive
- `SourceReceipt` 与 receipt identity 只作为 type/evidence 内部坐标存在；`sourceReceiptRef / keyHashRef / bundlePatchPath / bundlePatchRef` 不成为 public authoring noun、read helper 或 Form exact surface 字段
- row-scoped source receipt disambiguation 由 runtime row id gate 承接；reorder/remove 下的 in-flight settle 不要求用户提供 row receipt 名称或额外 public helper
- `key` 的语义域是 canonical JSON-like value；非 canonical key 必须由 source internal law 确定性拒绝和诊断，不得进入远端 IO
- 同 `keyHash` 的 forced refresh 由内部 generation gate 承接；旧任务 settle 不允许覆盖更新 generation 的 source snapshot
- `triggers` 当前只承认 `onMount` 与 `onKeyChange`
- `triggers / debounceMs / concurrency / submitImpact` 只作为同一 `source(...)` act 的 scheduling 与 submit-lane 细节存在
- 手动 source refresh 当前不属于 day-one Form exact surface；底层 explicit refresh 原语只保留为 internal route 与后续受控 reopen candidate
- 若 `field(path)` 穿过列表项，用户继续写 canonical item path；runtime 负责把它 resolve 成 row-scoped source，不额外要求用户写 `[]` pattern
- Form 不接受 `target / scope / slot / reset` 一类 second-write carrier spelling
- Form 不开放 `form.source(...)`、`Form.Source`、`useFieldSource(...)` 或其他第二 companion route
- 如果没有明确的主 consumer field，这个场景不进入 day-one exact surface；默认转 QueryProgram 或等待受控 reopen

## exact runtime handle

```ts
interface FormHandle<TValues extends object, TDecoded = TValues> {
  validate(): Effect.Effect<void>
  validatePaths(paths: ReadonlyArray<string> | string): Effect.Effect<void>

  submit(options?: {
    onValid?: (decoded: TDecoded, ctx: { values: TValues }) => Effect.Effect<void> | Promise<void> | void
    onInvalid?: (errors: unknown) => Effect.Effect<void> | Promise<void> | void
  }): Effect.Effect<SubmitVerdict<TDecoded>>

  reset(values?: TValues): Effect.Effect<void>
  setError(path: string, error: FormErrorLeaf): Effect.Effect<void>
  clearErrors(paths?: ReadonlyArray<string> | string): Effect.Effect<void>

  field(path: string): {
    set(value: unknown): Effect.Effect<void>
    blur(): Effect.Effect<void>
  }

  fieldArray(path: string): {
    append(value: unknown): Effect.Effect<void>
    prepend(value: unknown): Effect.Effect<void>
    insert(index: number, value: unknown): Effect.Effect<void>
    update(index: number, value: unknown): Effect.Effect<void>
    replace(nextItems: ReadonlyArray<unknown>): Effect.Effect<void>
    remove(index: number): Effect.Effect<void>
    swap(indexA: number, indexB: number): Effect.Effect<void>
    move(from: number, to: number): Effect.Effect<void>
    byRowId(rowId: string): {
      update(value: unknown): Effect.Effect<void>
      remove(): Effect.Effect<void>
    }
  }
}
```

当前 exact runtime surface 只保留：

- effectful validate / submit / mutation
- 单一 submit noun：`submit`
- field / list mutation 收口到同一个 handle
- positional edit 与 identity edit 同时存在，但 `replace` 继续固定为 roster replacement
- `getState`、`field(path).get`、`fieldArray(path).get` 不进入 exact handle

post-make logic augmentation、bridge residue、pure projection helper 都不属于当前 exact surface。

## exact data-support namespace roles

`Form.Error` 与 `Form.Companion` 当前都只保留 data-support 身份。

`Form.Error` 只允许承接：

- canonical leaf constructor
- selector descriptor factory
- `toRenderInput` 这类纯数据 normalizer

`Form.Companion` 只允许承接：

- root-visible selector primitive family noun
- sanctioned companion bundle read primitive
- row-owner companion bundle read primitive

`Form.Companion` 不承接 authoring route、host route、truth ownership 或 raw internal landing path。

对 `Form.Companion` 这组 selector primitive，当前再冻结一条类型安全规则：

- opaque descriptor 只解决“形态不可执行”和“只经 single host gate 消费”这一级安全
- 它不自动等于结果类型已经闭合
- 若后续要求 companion selector 的结果类型提升到 declaration-driven inference，必须继续通过同一条 `field(path).companion({ deps, lower }) -> Form.Companion.* -> useSelector(handle, ...)` 解释链完成
- 若现有 primitive noun 在理论上无法承载目标级静态推导，就应重开 primitive 形态，而不是把 `unknown` 常态化写进 canonical 口径
- 当前 authority 已允许一条 `+0` public concept 的 type-only metadata carrier route；实现必须证明 React host 不解释 Form declaration metadata，且 `Form.Companion.*` 只消费同一解释链上的类型信息

与之相邻的 `Form.Error.field(path)` 当前已完成一项代码级收口：

- 它的 host-side 返回值当前已经固定到稳定 explain union，覆盖 `error / pending / stale / cleanup / undefined`
- source-backed field 的 `SourceReceipt.status === "error"` 继续通过同一个 `error` explain 分支表达，不 lower 成 `FormErrorLeaf`
- 这条结果类型继续只服务 selector primitive 的返回面，不反向创建第二 reason authority

当前 freeze 到的 selector primitive 固定包括：

- `Form.Error.field(path)` 返回 opaque、descriptor-first、non-executable token
- 该 token 当前可直接交给 `useSelector(handle, Form.Error.field(path))` 消费
- `Form.Companion.field(path)` 返回 opaque、descriptor-first、non-executable token
- 该 token 当前可直接交给 `useSelector(handle, Form.Companion.field(path))` 消费
- `Form.Companion.byRowId(listPath, rowId, fieldPath)` 返回 opaque、descriptor-first、non-executable token
- 该 token 当前可直接交给 `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))` 消费
- 若同一个 `listPath + rowId` 在当前 active owner universe 中匹配到多个 nested owner，selector 必须返回未命中，而不是任意选择一个 parent owner；这条规则不新增 public parent row token
- 当前这条消费路径已经能解释 `error / pending / stale / cleanup` 四类最小 reason 结果
- companion primitive 当前最小只承接 sanctioned `availability / candidates` bundle
- row-owner primitive 当前只承接 current roster 下的 sanctioned `availability / candidates` bundle
- 其中 `error` 当前至少携带 `reasonSlotId + sourceRef`；`pending / stale / cleanup` 继续携带更完整的最小结构化坐标
- 对 source failure explain，这条消费路径当前还会携带 `subjectRef.kind="task"` 与稳定 field path task id
- 对 list row field error，这条消费路径当前还会携带 `subjectRef.kind="row"` 与稳定 row id

当前同时冻结：

- caller 不可改 precedence
- precedence policy 与 source resolution 单点停在 `Form.Error`
- companion 读取不得泄露 raw internal landing path
- `root / item / list / submit source` 的 exact spelling 继续后置
- field-ui 当前只冻结为字段侧辅助状态边界，不冻结 exact leaf shape
- field-ui 当前只冻结“合法字段侧辅助状态边界，truth 仍归 Form canonical state”这条 exact 结论
- `touched / dirty` noun、field-ui exact leaf shape、field-ui helper family 与任何 sugar factory 全部继续停在 supporting page

render boundary 当前只冻结一条公式：

- `leaf + snapshot + render-only context`

本页当前不冻结：

- render-only context 的 exact member shape
- render execution 的 exact spelling

它明确不承接：

- host acquisition
- subscription helper
- render execution
- snapshot ownership
- package-local projection family

## exact host / projection owner

Form 自己不再拥有 canonical React hook family 或 pure projection family。
host acquisition 与 pure projection 的 exact spelling、ownership 与 selector law，统一看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md) 与 [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)。

当前 sanctioned optional helper contract 不属于 Form exact surface。
它的 exact noun、import shape、禁止项与 authority 单点，统一看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)。
若后续补入建立在 `$form` raw truth 之上的轻量 strict derivation corollary，它也只会落在 core host adjunct route。

Form 侧当前参与这组 adjunct contract 的唯一公开对象只有：

- `Form.Error.field(path)`
- `Form.Companion.field(path)`
- `Form.Companion.byRowId(listPath, rowId, fieldPath)`

它们都是 form-owned selector primitive。
owner 分别固定在 `Form.Error` 与 `Form.Companion`。
其中 selector primitive owner 不等于 authoring act owner，也不等于 truth owner。
对 companion 来说，authoring act owner 与 truth origin 继续固定在 `field(path).companion({ deps, lower })`。
当前若讨论 `field(path).companion(...)`、`Form.Companion.*` 与 `useSelector(handle, ...)` 的类型安全，只允许分三类记录：

- 理论可达但当前未实现
- 已通过 returned-carrier route 实现，其他 authoring route 诚实降级
- 理论不可达且需要重开 API

不得用“实现暂时如此”替代这条裁决。

`@logixjs/form/react`、仓内任何 repo-local `useForm*` / list wrapper、以及任何 wrapper family 都只算 residue，不构成 authority。
官方 toolkit 若提供 Form DX wrapper，它也只属于 [../runtime/11-toolkit-layer.md](../runtime/11-toolkit-layer.md) 的 secondary layer，不进入 Form exact surface。
Form exact surface 不预承诺 `factory` noun、wrapper family、helper-side error precedence、field-ui helper、write-side helper、derived meta helper、list sugar、`Form.Source` family 或 `useFieldSource` helper。

field-ui 当前的冻结面只到这里：

- 它属于 Form canonical state truth 下的合法字段侧辅助状态边界
- 当前 authority 继续维持 `ui: unknown`
- `touched / dirty` 只算现有实现与 example 的观察值，不构成 exact public leaf

## teaching corollary

当前 exact 用户教学主线继续只是一条 corollary：

1. `Form.make(...)`
   其中 local remote dependency 的 canonical 写法固定为 `field(path).source({ resource, deps, key, ... })`
2. `useModule(formProgram, options?)`
3. `useSelector(handle, selector, equalityFn?)`
4. `Form.Error / Form.Companion` 只做 data-support

这条 corollary 不构成第二组合律，也不构成第三 route。

## Freeze Gate

后续只有在同时满足下面条件时，才允许改写本页：

- 不重新引入第二 declaration carrier
- 不重新引入第二 assembly law、第二 composition law、第二 host truth
- 不让 pure projection family 回到 Form canonical surface
- 任何新 noun 都能回链到 root DSL、effectful handle 或 core host law
- 任何新 noun 都能删掉一个旧 boundary、旧 alias 或旧特例
- 任何 convenience 层 reopen 都必须先证明缺失的是 primitive contract，不是 wrapper 形态

primitive-first reopen 当前只允许讨论：

- field-ui 叶子合同
- list row identity 公共 projection contract
- `Form.Error / Form.Companion` 追加 selector primitive

## 非目标

- 本页不再代持 `@logixjs/form/react` 的 exact shape
- 本页不再代持 `view()`、`FormView` 或 `FormViewContract`
- 本页不把 residue export 继续当成 public truth
- 本页不承诺 convenience sugar 的内部实现形态
- 本页不保留 raw string rule message 的 canonical 写法

## 相关规范

- [./00-north-star.md](./00-north-star.md)
- [./05-public-api-families.md](./05-public-api-families.md)
- [./09-operator-slot-design.md](./09-operator-slot-design.md)
- [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)
- [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)
- [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- [../runtime/13-selector-type-safety-ceiling-matrix.md](../runtime/13-selector-type-safety-ceiling-matrix.md)

## 当前一句话结论

13 当前已冻结为更小的 core-first exact contract：`@logixjs/form` root 只保留 `Form.make / Form.Rule / Form.Error / Form.Companion`，`./locales` 只保留 optional plain locale assets；local remote dependency 的 exact 用户写法固定为 `field(path).source({ resource, deps, key, ... })`，`Form.Error.field(path)`、`Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)` 是当前 exact selector primitive。companion exact lower-result inference 通过 returned-carrier type-only metadata route 闭合；imperative void callback 仍可运行但不承诺 exact selector result typing。field-ui 与 builtin message sugar 只保留最小边界结论。
