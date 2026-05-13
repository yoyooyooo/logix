---
title: Logix React 注意事项（Agent-first）
---

# Logix React 注意事项（Agent-first）

本页是 React host 专题，按需阅读。L0/L1 弱模型默认只读取 `references/llms/05-react-usage-basics.md`。默认生成骨架不读取本页高级 scope API。

## 0) L0/L1 host 公式

```tsx
const local = useModule(Program, options?)
const selected = useSelector(handle, selector, equalityFn?)
```

读取只有一条主门：`useSelector(handle, selector, equalityFn?)`。L0/L1 默认 selector input 使用 `fieldValue(path)`、少量同 UI 原子字段使用 `fieldValues(paths)`，或使用领域包 selector primitives。不要生成无参 `useSelector(handle)`。

## 1) 基础边界（先别踩坑）

- 所有 hooks 必须在 `RuntimeProvider` 子树内。
- `useModule(Program, options?)` 是局部实例创建或复用。
- 领域包不拥有第二套 canonical React hook family。
- `useDispatch(handle)` 只在现有 action contract 已给出时使用，禁止猜 action type 或 payload shape。

## 2) L2/L3 高级 scope API

```tsx
const shared = useModule(ModuleTag)
const child = useImportedModule(parent, ModuleTag)
```

- `useModule(ModuleTag)` 是当前 scope 共享实例 lookup。
- `useImportedModule(parent, ModuleTag)` 只解析 parent instance scope 下的 child。
- 这两个入口只在任务明确要求共享 scope 或 parent-child scope 时使用，不进入 L0/L1 默认生成骨架。
- 生成普通 Form、Core 或 React 接入代码时，不引用本小节 API。

## 3) Form selector 推荐写法

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

要点：

- `fieldValue(path)` 是 core-owned selector helper。
- `fieldValues(paths)` 是 core-owned tuple selector helper，只用于少量字段同属一个 UI 原子并且总是一起渲染的场景。
- `Form.Error.field(path)` 与 `Form.Companion.*` 是 Form-owned selector primitives。
- 这些 selector 都只通过 `useSelector` 消费。
- 函数 selector 只允许专家场景使用，并且必须通过 core selector law 的 precision admission；L0/L1 生成代码不得把函数 selector 当默认 recipe。

## 4) 类型安全边界

- `fieldValue("literal.path")` 可通过 typed handle 推导 exact value。
- `fieldValue("")` 在 `useSelector(typedHandle, fieldValue(""))` 调用点可拿到 typed handle state path completion。
- `fieldValues(["a", "b"])` 可通过 typed handle 推导 readonly tuple，固定 10 个 tuple 槽位可拿到 typed handle state path completion，例如 `fieldValues([""])` 与 `fieldValues(["count", ""])`；widened `string[]` 在 typed handle 下拒绝。
- widened `string` path 在 typed handle 下拒绝，因为它不能 against state 校验；handle 已退成 `any` 时结果同步退成 `any`。
- `Form.Companion.field/byRowId` 的 exact lower-result typing 依赖 returned-carrier metadata。
- `void` callback companion authoring runtime-valid，但 exact selector result 诚实降级。

## 5) 禁止项

- 无参 `useSelector(handle)` 作为 public host read
- Form-owned React hook family
- Form-specific React entrypoint package
- public path carrier
- public row owner token
- returned carrier as selector
- public object/struct projection descriptor

## 6) 性能与解释链

- 组件重渲染应关注“selector input 粒度 + equality 策略”，不要盲目减少 hook 数量。
- `fieldValues(paths)` 默认按 tuple slot 做 shallow equality；不要为了减少 hook 数量把无关字段塞进同一个 tuple。
- React host projection route 由 core selector law 决定；React 侧不自行推导 selector eligibility。
- React 层事件最终仍要可回链到 runtime 锚点（module/instance/txn/op）。

## 7) 常见反模式

- 在 Provider 外调用 hooks。
- 把 `ModuleTag` 当成同模块多 `Program` 的选择器。
- 把 `useImportedModule` 当成 root lookup。
- 组件层偷偷保存业务状态副本，绕开 Logix 状态面。
- 为 Form 读侧生成第二 hook family。

## 8) 延伸阅读（Skill 内）

- `references/agent-first-api-generation.md`
- `references/llms/05-react-usage-basics.md`
