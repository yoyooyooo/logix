---
title: React 集成基础（LLM 版）
---

# React 集成基础（LLM 版）

## 1) 常用 hooks

- `useModule(Program, options?)`：创建或复用局部实例。
- `useSelector(handle, selector, equality?)`：订阅状态切片。
- `useDispatch(handle)`：获取稳定 dispatch。只有任务给出现有 action contract 时才生成调用。

## 2) 使用约束

- hooks 必须在 `RuntimeProvider` 子树内。
- L0/L1 默认 selector input 使用 `fieldValue(path)`、少量同 UI 原子字段使用 `fieldValues(paths)`，或使用领域包 selector primitives。
- 不生成无参 `useSelector(handle)`。
- 函数 selector 只属于专家场景，必须能通过 core selector precision admission；不要作为默认 recipe。
- 多实例场景通过 `useModule(Program, options?)` 的 options 使用实例 key；不要在 L0/L1 默认代码中生成共享 scope 或 parent-child scope API。
- 领域包不生成第二套 canonical React hook family。
- 禁止根据字段名、submit 文案或 UI 事件猜 string action 或 payload shape。

## 3) Form read 公式

```tsx
const value = useSelector(form, fieldValue("warehouseId"))
const [warehouseId, quantity] = useSelector(form, fieldValues(["warehouseId", "quantity"]))
const error = useSelector(form, Form.Error.field("warehouseId"))
const companion = useSelector(form, Form.Companion.field("warehouseId"))
const rowCompanion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

L0/L1 默认 Form 错误读取只生成 `Form.Error.field(path)`。其他错误聚合读取需要任务明确给出。
returned carrier 只用于类型元数据回传，React 读取永远写 `useSelector(handle, Form.Companion.field(...))` 或 `useSelector(handle, Form.Companion.byRowId(...))`。

禁止生成：

- no-arg `useSelector(handle)`
- L0/L1 默认函数 selector
- Form-owned React hook family
- Form-specific React entrypoint package
- public path carrier
- public row owner token
- returned carrier as selector
- public object/struct projection descriptor
- guessed Form error helpers beyond the listed selector primitives

## 4) 性能要点

- 优先细粒度 selector input。
- 多个无关字段用多个 selector；少量同 UI 原子字段可以用 `fieldValues([...])` 返回 tuple。
- 避免在同一组件里无意义重复 acquisition；一次 `useModule(...)` 后用多个 selector 更清楚。
- 组件层不维护与 Logix 冲突的状态副本。
