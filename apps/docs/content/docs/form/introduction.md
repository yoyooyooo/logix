---
title: Introduction
description: The current Form mental model and owner boundaries.
---

Form is for editable input state: values, validation, errors, submit, remote facts, local support facts, and list row identity.

The important point is that Form is a Logix Program, not a separate React runtime.

```text
Form declaration   Form.make(...)
Runtime mounting   Runtime.make(FormProgram) + RuntimeProvider
React reads        useModule + useSelector
Writes             FormHandle methods
Evidence           Runtime.check / Runtime.trial / Runtime.compare
```

## Owner map

| Concept | Owner | Public spelling |
| --- | --- | --- |
| declaration | Form | `Form.make(id, config, define)` |
| field value | Form state | `fieldValue(path)` |
| form metadata | Form state | `rawFormMeta()` |
| final validation truth | rule/root/list/submit | `field.rule`, `root`, `list`, `submit` |
| remote fact ingress | source lane + Query resource | `field(path).source(...)` |
| local soft fact | companion lane | `field(path).companion(...)` |
| runtime mutation | Form handle | `form.field`, `form.fieldArray`, `form.submit` |
| host read | React host law | `useModule + useSelector` |
| verification | runtime control plane | `Runtime.check/trial/compare` |

## Hard boundaries

- Companion is synchronous and local; it cannot perform IO or emit final validation truth.
- Source owns remote fact ingress; it is not an options API and not a manual React fetch helper.
- Row identity is handled through Form internals and handle methods such as `byRowId(...)`; it is not a public row token family.
- Form does not own a separate React hook family.
