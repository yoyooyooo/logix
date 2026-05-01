---
title: Form 领域落地手册（Agent-first）
---

# Form 领域落地手册（Agent-first）

## 0) 适用场景

- 你在生成或评审 Form authoring、runtime handle、React read、verification 代码。
- 你需要稳定区分 remote fact、local soft fact、final truth、host read 和 verification control plane。

## 1) 当前公开公式

```ts
const FormProgram = Form.make(id, config, ($) => {
  $.field(path).source(...)
  $.field(path).companion(...)
  $.field(path).rule(...)
  $.root(...)
  $.list(...)
  $.submit(...)
})

const runtime = Logix.Runtime.make(FormProgram)
```

`config` 只放 `values / initialValues / validateOn / reValidateOn / debounceMs` 一类 setup。领域声明只放在 `define` callback。
`Form.make(...)` 的返回值直接进入 `Logix.Runtime.make(...)` 与 `useModule(...)`。Form 领域主链不包 `Program.make(...)`。

## 2) Owner-lane 选择

| 需求 | 用法 | 禁止 |
| --- | --- | --- |
| 远端事实、异步 options、pending/stale/error lifecycle | `field(path).source(...)` | `companion.lower` 内 IO、manual refresh helper |
| 本地 availability、candidates、keep current、同步整形 | `field(path).companion(...)` | final blocking、errors、submit verdict |
| required、cross-row uniqueness、decode、submit blocking | `field(path).rule(...)`、`root(...)`、`list(...)`、`submit(...)` | companion final truth |
| React read | `useSelector(handle, Form.Error.field(path))` 或 `Form.Companion.*` | Form-owned React hooks |

## 3) Source 规则

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
  triggers: ["onMount", "onKeyChange"],
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

- `source` 是 remote fact ingress。
- `deps` 与 `key` 决定任务身份与调度。
- `submitImpact` 只声明 source lifecycle 对 submit 的影响，不拥有 submit verdict。
- day-one triggers 只认 `onMount` 和 `onKeyChange`。

## 4) Companion 规则

```ts
const carrier = $.field("warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: "interactive" as const },
      candidates: { items: [] },
    }
  },
})

return [carrier] as const
```

- `lower` 必须同步、纯计算、无 IO。
- companion 只产本地 soft fact。
- returned carrier 只承接 type-only metadata，用于 exact companion selector typing。
- `void` callback 写法有效，但 exact companion selector result 诚实降级。

## 5) React read

```tsx
const value = useSelector(form, fieldValue("warehouseId"))
const error = useSelector(form, Form.Error.field("warehouseId"))
const companion = useSelector(form, Form.Companion.field("warehouseId"))
const rowCompanion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

读侧只生成 `useSelector(handle, selector)`。不要新增 Form-owned React hook family、public path carrier、public row owner token 或 carrier-bound selector route。
L0/L1 默认 Form 错误读取只生成 `Form.Error.field(path)`。其他错误聚合读取需要任务明确给出。

只有任务明确给出现有 action contract 时才生成 `useDispatch(handle)`。不要为了提交按钮发明 string action、submit command 或 payload shape。

## 6) Verification

业务默认只生成静态快检与启动试运行：

```ts
await Logix.Runtime.check(FormProgram, { mode: "static" })
await Logix.Runtime.trial(FormProgram, { mode: "startup" })
```

交互验证只在测试文件、验证文件或 SubAgent 压测任务中生成。输入形状是 `fixtures/env + steps + expect`，不要把它建模成业务对象。

不要把 `fixtures/env + steps + expect` 写成业务 authoring surface。

## 7) 延伸阅读（Skill 内）

- `references/agent-first-api-generation.md`
- `references/logix-react-notes.md`
- `references/llms/05-react-usage-basics.md`
