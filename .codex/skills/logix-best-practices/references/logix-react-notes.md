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
import { shallow, useModule, useSelector } from '@logix/react'

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
import { shallow, useModule } from '@logix/react'

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
import { useImportedModule, useModule, useSelector } from '@logix/react'

const host = useModule(HostModule, { key: 'SessionA' })
const child = useImportedModule(host, Child.tag)

const value = useSelector(child, (s) => s.value)
```

## 5) `useDispatch`：拿稳定 dispatch（可选）

`useDispatch(handle | runtime)` 返回稳定的 `dispatch` 函数；当你希望把 dispatch 下传给子组件、或避免在 JSX 里捕获闭包时可用。

