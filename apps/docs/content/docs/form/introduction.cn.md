---
title: 介绍
description: 当前 Form 心智模型与 owner boundaries。
---

Form 用于 editable input state：values、validation、errors、submit、remote facts、local support facts 与 list row identity。

关键点：Form 是 Logix Program，不是另一套 React runtime。

```text
Form declaration   Form.make(...)
Runtime mounting   Runtime.make(FormProgram) + RuntimeProvider
React reads        useModule + useSelector
Writes             FormHandle methods
Evidence           Runtime.check / Runtime.trial / Runtime.compare
```

## Owner map

| 概念 | Owner | 公开写法 |
| --- | --- | --- |
| declaration | Form | `Form.make(id, config, define)` |
| field value | Form state | `fieldValue(path)` |
| form metadata | Form state | `rawFormMeta()` |
| final validation truth | rule/root/list/submit | `field.rule`、`root`、`list`、`submit` |
| remote fact ingress | source lane + Query resource | `field(path).source(...)` |
| local soft fact | companion lane | `field(path).companion(...)` |
| runtime mutation | Form handle | `form.field`、`form.fieldArray`、`form.submit` |
| host read | React host law | `useModule + useSelector` |
| verification | runtime control plane | `Runtime.check/trial/compare` |

## 硬边界

- Companion 是同步 local fact；不能做 IO，也不能产出 final validation truth。
- Source 持有 remote fact ingress；它不是 options API，也不是 React 手动 fetch helper。
- Row identity 通过 Form internals 与 `byRowId(...)` 等 handle methods 管理；不是公开 row token family。
- Form 不持有单独 React hook family。
