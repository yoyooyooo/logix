---
title: Form API Tutorial
status: accepted
last-updated: 2026-05-11
---

# Form API Tutorial

## Current route

Form only teaches one route:

```text
Form.make(id, config, define)
  -> FormProgram
  -> Runtime / Program law
  -> FormHandle
  -> useModule + useSelector
```

There is no `@logixjs/form/react`, no package-local `useForm*`, no public `Form.Path`, no `Form.Source`, no public row token, and no manual source refresh helper. If old examples mention these names, treat them as historical material, not as current teaching route.

## 1. Minimal form

```ts
import { Effect, Schema } from "effect"
import * as Form from "@logixjs/form"

const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

type Values = Schema.Schema.Type<typeof Values>

export const ContactForm = Form.make(
  "ContactForm",
  {
    values: Values,
    initialValues: { name: "", email: "" } satisfies Values,
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange", "onBlur"],
  },
  ($) => {
    $.field("name").rule(Form.Rule.required())
    $.field("email").rule(Form.Rule.email())
    $.submit({ decode: Values })
  },
)
```

Authoring rule:

- `config` carries static setup only.
- `define($)` carries all Form declarations.
- `Form.make` returns a `FormProgram`, not a React hook or controller object.

## 2. React read path

```tsx
import * as Form from "@logixjs/form"
import { fieldValue, rawFormMeta, useModule, useSelector } from "@logixjs/react"

export function ContactFormView() {
  const form = useModule(ContactForm)

  const name = useSelector(form, fieldValue("name"))
  const email = useSelector(form, fieldValue("email"))
  const meta = useSelector(form, rawFormMeta())
  const nameError = useSelector(form, Form.Error.field("name"))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void Effect.runPromise(form.submit())
      }}
    >
      <input
        value={name}
        onChange={(event) => void Effect.runPromise(form.field("name").set(event.target.value))}
        onBlur={() => void Effect.runPromise(form.field("name").blur())}
      />
      <input
        value={email}
        onChange={(event) => void Effect.runPromise(form.field("email").set(event.target.value))}
        onBlur={() => void Effect.runPromise(form.field("email").blur())}
      />
      <pre>{JSON.stringify({ meta, nameError }, null, 2)}</pre>
      <button type="submit">Submit</button>
    </form>
  )
}
```

Read rule:

- React acquisition is `useModule`.
- Pure projection is `useSelector`.
- Form contributes selector descriptors such as `Form.Error.field(path)` and `Form.Companion.byRowId(...)`.
- Form does not own a React hook family.

## 3. Remote fact: `field(path).source(...)`

Remote facts enter Form through a field-owned source declaration. Query/resource owner stays outside Form.

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

Source rule:

- `resource` is Query-owned.
- `deps` is the only dependency authority.
- `key` returns `undefined` when inactive.
- `submitImpact` affects submit lane but does not become final truth.
- No `Form.Source`, no `useFieldSource`, no public manual refresh helper.

## 4. Local soft fact: `field(path).companion(...)`

Companion is synchronous local coordination. It is not a validator and not a remote loader.

```ts
const warehouseCompanion = $.field("items.warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    const taken = new Set(
      Array.isArray(ctx.deps["items.warehouseId"])
        ? ctx.deps["items.warehouseId"].filter((value): value is string => typeof value === "string" && value.length > 0)
        : [],
    )

    return {
      availability: { kind: ctx.deps.countryId ? "interactive" : "hidden" },
      candidates: {
        items: Warehouses.filter((candidate) => candidate === ctx.value || !taken.has(candidate)),
        keepCurrent: true,
      },
    }
  },
})

return [warehouseCompanion] as const
```

Companion rule:

- `lower` is synchronous, pure, no IO.
- returned bundle can contain `availability` and `candidates` only.
- final errors, blocking, verdict, submitAttempt, and reason truth stay in rule/root/list/submit.
- returned-carrier is the canonical route for exact selector result typing.
- void callback remains runtime-valid but selector result is honest `unknown`.

## 5. Lists and row identity

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
  item: Form.Rule.make(/* row final rule */),
  list: Form.Rule.make(/* cross-row final rule */),
})
```

Runtime mutation:

```ts
await Effect.runPromise(form.fieldArray("items").append({ id: "r1", warehouseId: "" }))
await Effect.runPromise(form.fieldArray("items").move(0, 2))
await Effect.runPromise(form.fieldArray("items").byRowId("r1").update({ id: "r1", warehouseId: "WH-001" }))
```

Row read:

```ts
const companion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Row rule:

- public truth is stable row identity, not React key and not array index.
- `byRowId` is an effectful handle/read descriptor primitive, not a public row token family.

## 6. Toolkit is optional DX, not core API

A toolkit may expose readable UI bindings only if each helper mechanically reduces to frozen primitives:

```ts
const nameInput = FormKit.input(form, "name")
// reduces to fieldValue + Form.Error.field + form.field(path).set/blur

const warehouseSelect = FormKit.selectByRowId(form, {
  list: "items",
  rowId,
  field: "warehouseId",
})
// reduces to fieldValue + Form.Companion.byRowId + Form.Error.field + handle mutation
```

Toolkit rule:

- toolkit does not enter `@logixjs/form` root;
- toolkit does not own truth;
- toolkit does not create a second host read family;
- toolkit helpers must be mechanically explainable through core/Form primitives.

## 7. Lane decision table

| Need | Use | Do not use |
| --- | --- | --- |
| Define a form | `Form.make(id, config, define)` | `Form.from`, wrapper factory |
| Remote fact | `field(path).source(...)` | `Form.Source`, `useFieldSource`, rule fetch |
| Local candidate/availability | `field(path).companion(...)` | async companion, final-truth companion |
| Final validation/truth | `field.rule`, `root`, `list`, `submit` | companion errors, source verdict |
| Runtime mutation | `FormHandle` | React-local controller truth |
| React read | `useModule + useSelector` | `@logixjs/form/react`, `useForm*` |
| Row mutation/read | `fieldArray(...).byRowId`, `Form.Companion.byRowId` | public row token, array index truth |
| Scenario/evidence | `Runtime.check/trial/compare` | Form scenario API, second report object |

## One-line version

Form core is deliberately small: one authoring act, one handle, one source lane, one companion lane, one final-truth lane, one core host read gate, and optional toolkit wrappers that mechanically reduce to those primitives.
