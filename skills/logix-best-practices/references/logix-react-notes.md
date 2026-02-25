---
title: Logix React 注意事项（用户视角）
---

# Logix React 注意事项（用户视角）

## 0) 30 秒选 API

- 需要模块实例 + dispatch：`useModule(handle)`。
- 只要状态切片：`useSelector(runtimeOrHandle, selector, equality?)`。
- 只要稳定 dispatch：`useDispatch(runtimeOrHandle)`。
- 父实例 imports 子模块：`useImportedModule(parent, Child.tag)`。

## 1) 基础边界（先别踩坑）

- 所有 hooks 必须在 `RuntimeProvider` 子树内。
- `useModule(handle, options)` 仅支持 `ModuleImpl` 句柄。
- 同一组件避免重复 `useModule(handle)`（无 selector）；通常一次 runtime + 多次 selector 更稳。

## 2) 推荐写法（默认）

```tsx
const mod = useModule(MyModule)
const loading = useSelector(mod, (s) => s.loading)
const vm = useSelector(mod, (s) => ({ name: s.user.name, age: s.user.age }), shallow)
const dispatch = useDispatch(mod)
```

要点：

- selector 返回对象/数组时，显式使用 `shallow` 或自定义 equality。
- selector 保持纯函数，不做副作用。

## 3) 多实例与 imports

- 多会话场景通过 `key` 区分实例身份。
- 子模块读取优先 `useImportedModule(host, Child.tag)`，避免跨实例串读。
- 组件里“当前 host + imported child”应来自同一父 scope。

## 4) Action 执行面

- 推荐执行：`ref.dispatchers.<K>(payload)`。
- 最底层：`ref.dispatch(action)` / `dispatch.batch([...])`。
- 监听面优先使用 token/结构化入口，避免散落字符串 tag。

## 5) 性能与解释链

- `useSelector` 会尽量走静态 ReadQuery lane（满足 static/readsDigest 条件时）。
- 组件重渲染应关注“选择器粒度 + equality 策略”，而不是盲目减少 hook 数量。
- React 层事件最终仍要可回链到 runtime 锚点（module/instance/txn/op）。

## 6) 常见反模式

- 在 Provider 外调用 hooks。
- 把 options 误传给非 ModuleImpl handle。
- 在同组件内大量重复 `useModule(handle)`。
- 组件层偷偷保存业务状态副本，绕开 Logix 状态面。

## 7) 延伸阅读（Skill 内）

- `references/llms/05-react-usage-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
