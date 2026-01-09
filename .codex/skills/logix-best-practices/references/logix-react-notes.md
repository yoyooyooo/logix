---
title: Logix React 注意事项（useModule/useSelector 性能与语义）
---

# Logix React 注意事项（useModule/useSelector 性能与语义）

本文件面向业务开发者，聚焦两个问题：

1) Hook 语义：什么时候用 `useModule` / `useSelector` / `useDispatch` / `useImportedModule`；  
2) 性能：一个组件内多次 selector 的推荐写法（避免无意义重渲染与重复订阅）。

## 1) 基本约束：所有 hooks 必须在 `RuntimeProvider` 子树内

`useModule/useSelector/useDispatch/useImportedModule` 都依赖当前 React Runtime；在 Provider 之外调用会直接报错。

## 2) `useModule` 的两类重载（不要混用 options 与 selector）

### 2.1 `useModule(handle, options?)`：创建/管理局部（会话级）实例

仅当 `handle` 是 `ModuleImpl`（或“带 `.impl` 的模块对象”）时，第二个参数才是 `options`（如 `key/gcTime/deps/suspend`）。

典型：多实例/多会话时，用 `key` 明确实例身份（同 key 复用）。

### 2.2 `useModule(handle, selector, equalityFn?)`：内联选择器（直接订阅切片）

当你传入 selector 时，`useModule` **返回 selector 的结果**，不再返回完整 runtime。

此时第二个参数只能是 selector（不能再传 options 对象）。

## 3) 一个组件内“多次 selector”的最佳实践

目标：既拿到 runtime（用于 dispatch），又能细粒度订阅状态切片。

### 3.1 推荐 A：`useModule` 只拿 runtime；用多个 `useSelector` 订阅切片

适合：多个字段分散使用、渲染树可拆分、想要最清晰的订阅边界。

```tsx
import { shallow, useModule, useSelector } from '@logixjs/react'

const runtime = useModule(MyModule) // runtime 引用稳定，不订阅状态

const loading = useSelector(runtime, (s) => s.isLoading)
const { name, age } = useSelector(runtime, (s) => ({ name: s.user.name, age: s.user.age }), shallow)
```

要点：

- selector 尽量返回原子值（string/number/boolean）。
- selector 返回对象/数组时，配合 `shallow`（或自定义 `equalityFn`）避免“内容不变但引用变了”的无意义重渲染。

### 3.2 推荐 B：把多个字段打包成对象 + `shallow`

适合：同一组件需要多个字段，且希望把订阅合并为一次。

两种等价写法（择一）：

- `useSelector(runtime, selector, shallow)`（推荐：避免重复调用 `useModule`）
- `useModule(handle, selector, shallow)`（当你不需要 runtime 或 runtime 已由其它 hook 提供时）

```tsx
import { shallow, useModule } from '@logixjs/react'

const { name, age } = useModule(
  MyModule,
  (s) => ({ name: s.user.name, age: s.user.age }),
  shallow,
)
```

### 3.3 避免：同一组件里对同一个 Module 多次 `useModule(handle)`（无 selector）

`useModule(handle)` 的职责是“解析/创建模块实例并返回 runtime 引用”。同一组件里重复调用通常没有收益，建议：

- 调用一次 `useModule(handle)` 拿 runtime；
- 后续用 `useSelector(runtime, ...)` 订阅需要的切片；
- 或者用 `useModule(handle, selector, equalityFn)` 直接拿切片（不需要 runtime 时）。

## 4) 跨实例 imports：用 `useImportedModule`（或 `host.imports.get`）

多实例场景下，子模块往往通过 `imports` 挂到“父实例 scope”里。此时不要用全局 `Child.tag` 去直接 `useModule`，否则容易读到“另一个实例”。

推荐：

```tsx
import { useImportedModule, useModule, useSelector } from '@logixjs/react'

const host = useModule(HostModule, { key: 'SessionA' })
const child = useImportedModule(host, Child.tag)

const value = useSelector(child, (s) => s.value)
```

## 5) `useDispatch`：拿稳定 dispatch（可选）

`useDispatch(handle | runtime)` 返回稳定的 `dispatch` 函数；当你希望把 dispatch 下传给子组件、或避免在 JSX 里捕获闭包时可用。

## 6) 067 Action Surface 在 React 侧怎么落地（actions/dispatchers/def）

> 结论先行：在 React 组件里，“定义锚点”用 `Module.actions.<K>`，“执行派发”用 `ref.dispatchers.<K>`。

### 6.1 `useModule` 的返回值（`ModuleRef`）里，几个面是正交的

- `ref.def`：定义锚点（通常是你传入的 Module/ModuleDef/ModuleTag）。用于 IDE 跳转/查找引用/安全重命名（尤其是 action key）。
- `ref.dispatchers.<K>(payload)`：**推荐执行面**。按 `def.actions`（ActionToken map）推导 payload 类型；调用即 dispatch。
- `ref.actions.<tag>(payload)`：兼容/糖。基于 Proxy 的动态属性（字符串 tag），不保证 IDE “跳转到定义”；仅在你明确接受这一点时使用。
- `ref.dispatch(action)` / `ref.dispatch.batch([...])`：最底层入口（直接发 action object），用于通用封装或批量派发。

### 6.2 如何获得“可跳转”的 action key（以及为什么有时跳不动）

要让 `ref.dispatchers.add(1)` 的 `add` 能跳回模块定义处的 `actions.add`：

- **优先**把模块导出为 `Module`（或至少保留 `ModuleDef`），并在组件里 `useModule(MyModule)`（而不是只拿到 `MyModule.impl` 再传给 hook）。
- 如果你确实只有 `impl` 可用：通常仍能拿到 `dispatchers` 的类型推导，但 IDE 跳转可能退化；这时用 `ref.def?.actions.<K>` 作为“手动锚点”定位定义。

> 经验：action key 尽量用可点访问的标识符（如 `add/inc/setKeyword`），避免 `foo/bar` 这类必须 `['foo/bar']` 的写法，否则重命名与跳转体验都会变差。067 下 ActionRef = `moduleId + actionTag`，业务侧不需要把 moduleId 再塞进 actionTag。
