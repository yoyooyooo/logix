---
title: Form API Quicklook
status: accepted
last-updated: 2026-05-11
---

# Form API Quicklook

## Canonical formula

```text
Form.make(id, config, define)
  -> FormProgram
  -> Runtime / Program law
  -> FormHandle
  -> useModule + useSelector
```

## Root imports

```ts
import * as Form from "@logixjs/form"
import { useModule, useSelector, fieldValue, fieldValues, rawFormMeta } from "@logixjs/react"
```

Allowed Form root values:

```ts
Form.make
Form.Rule
Form.Error
Form.Companion
```

Rejected root/deep routes:

```ts
Form.Path
Form.SchemaPathMapping
Form.SchemaErrorMapping
Form.Source
Form.Row
Form.Fact
Form.SoftFact
@logixjs/form/react
useForm / useField / useFieldArray / useCompanion / useFieldSource / useFormSelector
```

## Authoring skeleton

```ts
const Program = Form.make(
  "InventoryForm",
  {
    values: ValuesSchema,
    initialValues,
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange", "onBlur"],
  },
  ($) => {
    $.field("name").rule(Form.Rule.required())

    $.field("provinceId").source({
      resource: ProvincesByCountry,
      deps: ["countryId"],
      key: (countryId) => (countryId ? { countryId } : undefined),
      submitImpact: "observe",
    })

    const warehouse = $.field("items.warehouseId").companion({
      deps: ["countryId", "items.warehouseId"],
      lower: (ctx) => ({
        availability: { kind: ctx.deps.countryId ? "interactive" : "hidden" },
        candidates: { items: computeCandidates(ctx.deps, ctx.value), keepCurrent: true },
      }),
    })

    $.list("items", {
      identity: { mode: "trackBy", trackBy: "id" },
    })

    $.submit({ decode: SubmitSchema })

    return [warehouse] as const
  },
)
```

## Read skeleton

```tsx
const form = useModule(Program)

const name = useSelector(form, fieldValue("name"))
const values = useSelector(form, fieldValues(["countryId", "items"]))
const meta = useSelector(form, rawFormMeta())
const nameError = useSelector(form, Form.Error.field("name"))
const warehouse = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

## Owner map

| Concept | Owner | Public spelling |
| --- | --- | --- |
| declaration | Form | `Form.make(..., define)` |
| remote fact ingress | source lane + Query resource owner | `field(path).source(...)` |
| local soft fact | companion lane | `field(path).companion(...)` |
| final truth | rule/root/list/submit lane | `field.rule`, `root`, `list`, `submit` |
| mutation/submit | Form handle | `form.field`, `form.fieldArray`, `form.submit` |
| host read | core React host law | `useModule + useSelector` |
| row identity | Form row owner internals + handle primitives | `fieldArray(...).byRowId`, `Form.Companion.byRowId` |
| verification | runtime control plane | `Runtime.check/trial/compare` |
| UI sugar | toolkit layer | mechanically reducible wrappers only |

## Hard guards

- Companion cannot be async/effectful.
- Companion cannot emit final truth keys (`errors`, `$form`, `submitAttempt`, `verdict`, `blockingBasis`, `reasonSlotId`, etc.).
- Source cannot become options API, `Form.Source`, or public refresh helper.
- React read cannot become a Form-owned hook family.
- Row identity cannot become a public row token or array-index truth.
- Verification cannot become a Form scenario/report authoring API.
