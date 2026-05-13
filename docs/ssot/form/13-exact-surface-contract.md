---
title: Form Exact Surface Contract
status: accepted
version: 23
last-updated: 2026-05-11
---

# Form Exact Surface Contract

## Authority

本页是 Form 最终用户 API 的唯一 exact authority。旧 proposal、旧 spec、旧 demo、historical/quarantine 说明若与本页冲突，全部以本页为准。当前执行口径为单轨 cutover：不保留兼容壳层，不保留旧 public deep import，不用 deprecated/alias 双轨解释当前 API。

Form 只承担输入状态领域 DSL 与 effectful domain handle。`Program / Runtime / React host / verification control plane` 继续由 core spine 持有。Form 不拥有第二 assembly law、第二 composition law、第二 host truth、第二 evidence truth 或第二 report truth。

## Final public root

`@logixjs/form` root 只承认以下 runtime value exports：

```ts
Form.make
Form.Rule
Form.Error
Form.Companion
```

`./locales` 只允许作为 optional plain locale asset subpath 存在；它不拥有 registration、render、merge、bucket mapping 或 helper policy。

以下 public root 或 public subpath 一律不属于当前 contract；若仍可从构建产物访问，视为待删除 bug，而不是 compatibility promise：

```ts
Form.Path
Form.SchemaPathMapping
Form.SchemaErrorMapping
Form.Source
Form.Row
Form.Fact
Form.SoftFact
Form.from
Form.commands
FormView
@logixjs/form/react
useForm
useField
useFieldArray
useCompanion
useFieldSource
useFormSelector
```

## Final public type surface

当前 surviving public types 只保留：

- `FormProgram<Id, TValues, TDecoded = TValues, TCompanionMetadata = {}>`
- `FormState<TValues>`
- `FormHandle<TValues, TDecoded = TValues>`
- `SubmitVerdict<TDecoded>`
- `FormErrorLeaf`
- `SourceReceipt<Data = unknown, Err = unknown>`
- `AvailabilityFact`
- `CandidateSet<Item = unknown>`
- `CompanionBundle`
- `CompanionLowerContext<TValues, P, Deps>`
- `CompanionDepsMap<TValues, Deps>`
- `CanonicalDepValue<TValues, P>`

`SourceReceipt` 只作为 type-only source snapshot shape 存在，用于 `CompanionLowerContext.source?` 与用户字段值类型表达。它不承接 public authoring noun、runtime identity API、read helper 或 evidence coordinate owner。

`TCompanionMetadata` 只作为 type-only phantom carrier，把已返回的 companion declaration metadata 传给 `Form.Companion.* -> useSelector`。它不对应 runtime public object，不开放 `FormProgram.metadata` 或 public metadata map authoring。

## Final composition law

唯一公开组合律：

```ts
Form.make(...) -> FormProgram -> Program / Runtime / React host law
```

`FormProgram` 只是 core `Program` 的领域 refinement。Form 不定义第二装配入口，也不接受 raw field fragment、factory wrapper 或 form-local React wrapper 作为 canonical path。

## Final authoring act

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
    submit(config?: { decode?: Schema.Schema<TDecoded> }): void

    readonly dsl: unknown
  }) => TDefineReturn,
): FormProgram<Id, TValues, TDecoded, CompanionMetadataFromDefineReturn<TDefineReturn>>
```

Frozen authoring rules：

- `config` 只承接 schema、initial values、validation mode、debounce 等 declarative setup。
- `define(form)` 只承接领域声明：`rules / field.rule / field.source / field.companion / root / list / submit / dsl`。
- `root / list` 是同一 authoring act 内的高级 helper，不是第二 carrier。
- `dsl` 是同一 authoring act 内的 advanced declaration helper，不是第二 authoring route。
- 任何把 declaration semantics、owner truth 或第二 route 塞回 `config` 的 convenience 都拒绝。
- 任何为少写几行而引入 wrapper/factory/hook family 的提案都默认拒绝，除非它证明缺的是 primitive contract 而不是 sugar。

## Remote source lane

远端事实只从字段 owner edge 进入：

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => (countryId ? { countryId } : undefined),
  triggers: ["onMount", "onKeyChange"],
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

列表项沿用同一 spelling：

```ts
$.field("items.profileResource").source({
  resource: RowProfile,
  deps: ["items.profileId"],
  key: (profileId) => (profileId ? { profileId } : undefined),
  submitImpact: "block",
})
```

Frozen source rules：

- `resource` 必须来自 Query owner。
- `deps` 是唯一依赖 authority。
- `key` 按 deps-as-args 理解；返回 `undefined` 表示 inactive。
- `triggers` 当前只承认 `onMount` 与 `onKeyChange`。
- `debounceMs / concurrency / submitImpact` 只作为同一 `source(...)` act 的 scheduling 与 submit-lane 细节存在。
- `SourceReceipt`、receipt identity、row receipt coordinate、key hash、generation gate 只作为内部 type/evidence 坐标存在。
- stale settle 不允许覆盖 current receipt/snapshot。
- `submitImpact: "block" | "observe"` 不夺取 submit truth；最终 blocking/verdict 仍归 rule/root/list/submit lane。
- Form 不开放 `Form.Source`、`form.source(...)`、`useFieldSource(...)`、manual source refresh helper、`target/scope/slot/reset` 第二写法。

## Companion lane

本地 soft fact 只从字段 owner edge 进入：

```ts
const warehouseCompanion = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: ctx.deps.countryId ? "interactive" : "hidden" },
      candidates: {
        items: computeCandidates(ctx.deps, ctx.value),
        keepCurrent: true,
      },
    }
  },
})

return [warehouseCompanion] as const
```

Frozen companion rules：

- `lower(ctx)` 必须同步、纯计算、无 IO。
- `lower(ctx)` 只能返回 `undefined` 或 local soft fact bundle object。
- day-one slot inventory 只承认 `availability / candidates`。
- companion 不能写 `values / errors / $form / submitAttempt / verdict / blockingBasis / finalTruth / reasonSlotId / compareFeed`。
- canonical errors 与 final truth 只归 `rule / root / list / submit`。
- 大候选集、远程过滤、异步搜索或重投影必须走 source / Query owner 或受控 reopen。
- 不开放 `list().companion`、`root().companion`、generic `Fact/SoftFact` namespace、carrier-bound selector route 或 companion hook family。

Typing corollary：

- returned-carrier 是当前 exact selector result inference 的 canonical teaching route。
- 多个 companion 需要 exact typing 时，`define` callback 返回 carrier tuple，例如 `return [a, b] as const`。
- imperative `void` callback 写法可以运行，但 selector result 必须诚实降级为 `unknown`；不得为它新增 second declaration accumulator 或 runtime public metadata object。

## Final truth / error lane

最终错误、decode、blocking、submit verdict 与 reason summary 只归 `rule / root / list / submit`。

```ts
type FormErrorLeaf = {
  origin: "rule" | "decode" | "manual" | "submit"
  severity: "error" | "warning"
  code?: string
  message: I18nMessageToken
}
```

Frozen error rules：

- canonical error carrier 只承认 `FormErrorLeaf`。
- rendered string 不进入 carrier。
- raw string 只允许停在 builtin message authoring edge，normalize 后不越过 Form authoring edge。
- decode error mapping 是 internal schema-error lowering，不暴露 `Form.SchemaErrorMapping` public route。
- manual error 写入只接受已成形 `FormErrorLeaf`。
- `severity: "warning"` 是 advisory leaf，不计入 submit blocking `errorCount`。

## Runtime handle

```ts
interface FormHandle<TValues extends object, TDecoded = TValues> {
  validate(): Effect.Effect<void>
  validatePaths(paths: ReadonlyArray<string> | string): Effect.Effect<void>

  submit(options?: {
    onValid?: (decoded: TDecoded, ctx: { values: TValues }) => Effect.Effect<void> | Promise<void> | void
    onInvalid?: (state: FormState<TValues>) => Effect.Effect<void> | Promise<void> | void
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

`getState`、`field(path).get`、`fieldArray(path).get` 不进入 exact handle；读侧继续走 core selector law。

## React host / read route

Form 不拥有 canonical React hook family 或 pure projection family。React 读侧只走 core host gate：

```tsx
import { useModule, useSelector, fieldValue, fieldValues, rawFormMeta } from "@logixjs/react"
import * as Form from "@logixjs/form"

const form = useModule(InventoryForm)
const name = useSelector(form, fieldValue("name"))
const meta = useSelector(form, rawFormMeta())
const nameError = useSelector(form, Form.Error.field("name"))
const warehouse = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

Form-owned selector primitives are data-support descriptors only：

```ts
Form.Error.field(path)
Form.Companion.field(path)
Form.Companion.byRowId(listPath, rowId, fieldPath)
```

它们不承接 host route、truth ownership、projection family 或 raw internal landing path。caller 不可改 precedence。row-owner primitive 必须基于 current active owner universe；不能回退为 index truth 或 public row token。

## Verification lane

`Runtime.check / Runtime.trial / Runtime.compare` 是 runtime control plane，不是 Form authoring API。Form scenario、trial feed、evidence artifact、compare feed、report shell 只能作为 verification/control-plane 物料存在，不得成为 Form public route、second report object 或 raw evidence default compare surface。

## Toolkit / DX layer

官方 toolkit 可以提供 human-readable UI binding，但只能停在 secondary layer，且每个 helper 必须可机械降解到本页 primitive：

```ts
FormKit.input(form, "name")
FormKit.selectByRowId(form, { list: "items", rowId, field: "warehouseId" })
```

Toolkit 不进入 `@logixjs/form` root，不持有第二 truth，不改 host law，不改 source/companion/final-truth owner law。

## Freeze gate

后续改写本页必须同时满足：

- 不新增第二 declaration carrier。
- 不新增第二 assembly/composition/host/evidence/report truth。
- 不把 React hook family 或 pure projection family放回 Form。
- 新 noun 能机械回链到 `Form.make`、Form handle、core host law 或 runtime control plane。
- 新 noun 能删除旧 boundary、旧 alias 或旧特例，而不是增加概念负担。
- convenience 先进入 toolkit/recipe；只有 primitive 缺失被证明时才允许重开 core exact surface。

## One-line final state

Form core final surface 是：`Form.make / Form.Rule / Form.Error / Form.Companion`；authoring 只走 `Form.make(id, config, define)`；remote fact 只走 `field(path).source(...)`；local soft fact 只走 `field(path).companion(...)`；final truth 只走 `rule/root/list/submit`；React read 只走 `useModule + useSelector`；DX 只允许进入可机械降解的 toolkit 二层。

## Final implementation closure gate

The accepted API shape is not only a documentation preference. Live package exports, examples, tests, specs, and generated teaching materials must remove compatibility-shaped public routes. Any remaining old name is a defect unless it is internal-only or trace-only and routed through [14-final-single-track-cutover-gate.md](./14-final-single-track-cutover-gate.md).
