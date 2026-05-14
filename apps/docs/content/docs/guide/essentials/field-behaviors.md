---
title: Field declarations
description: Field-level behavior as a local logic-builder declaration, not a public namespace.
---

Field declarations describe derived fields, external stores, and resource-backed source fields. They are authored locally through the logic builder and compiled during `Program.make`.

## Core route

```ts
const logic = Module.logic("fields", ($) => {
  $.fields({
    fullName: $.fields.computed({
      deps: ["firstName", "lastName"],
      get: (first, last) => `${first} ${last}`,
    }),
  })

  return Effect.void
})
```

`$.fields` is a declaration collector. The standalone compiler machinery is internal. User code should not import or depend on an independent field system.

## Domain route

Form, Query, and future domain packages use the same compiler substrate but expose their own domain language.

```ts
Form.make("Contact", config, ($) => {
  $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
  $.field("countryId").source({ resource, deps: ["regionId"], key: (regionId) => ({ regionId }) })
})
```

The domain owns its public spelling. The compiled asset still belongs to the program assembly path.

## Boundary

Use field declarations for deterministic derivation or source wiring. Use ordinary logic for workflows. Use Form rules for validation and final form truth.
