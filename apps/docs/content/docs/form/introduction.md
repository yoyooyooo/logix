---
title: Introduction
description: The owner map and public route for Logix Form.
---

Form is a program-first domain package. `Form.make` produces a program that can be mounted by `Runtime.make`, imported by another program, or acquired locally in React.

## Owner map

| Concern | Owner |
| --- | --- |
| editable values | Form state |
| final validation truth | field/root/list/submit rules |
| remote facts | `field(path).source(...)` |
| local soft facts | `field(path).companion(...)` |
| list identity | Form list policy and row-id handle routes |
| React reads | `useSelector` with core/Form selector descriptors |
| runtime execution | Program/Runtime |

## Public route

```ts
const ContactForm = Form.make("ContactForm", config, ($) => {
  $.field("email").rule(Form.Rule.make({ required: "Email required", email: "Invalid email" }))
  $.submit({ decode: SubmitSchema })
})
```

## Boundary

A form is not a React controller object. The handle is a domain extension over the same module handle route. UI components read with selectors and call handle commands.
