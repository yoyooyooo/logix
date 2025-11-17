# Pattern: Module Multi-Instance Strategy

> **Status**: Draft
> **Context**: 处理 Dashboard Widget、列表项、多窗口等需要“同一逻辑、多份数据”的场景。

在 Logix 体系中，当业务需要“同一个 Module 逻辑在同一页面存在多个独立副本”时（例如两个独立的计数器、多个聊天窗口），主要有两种实现路径：

1.  **工厂模式 (Factory Pattern)**：显式创建不同的 Module 实例（不同的 Tag）。
2.  **作用域模式 (Scope Pattern)**：复用同一个 Module Tag，但在不同的 Effect Scope 中提供不同的 Runtime。

**结论先行**：在当前主线中，**工厂模式** 是首选的最佳实践。

---

## 1. 方案一：工厂模式 (The Factory Pattern) [推荐]

### 1.1 核心原理

利用 `Logix.Module` 本身就是 Tag 构造器的特性。每次调用工厂函数，都生成一个新的 `Context.Tag`（即一个新的 Module 实例）。这在 Logix 架构中是原生支持的，因为 Module 定义与实例身份是绑定的。

### 1.2 实现范式

**第一步：定义形状与逻辑模板 (Definition)**
不要直接创建 Module 实例，而是先定义 Shape 和 Logic Template。

```typescript
// features/counter/definition.ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'

// 1. 定义形状 (Shape)
export const CounterState = Schema.Struct({ count: Schema.Number })
export const CounterActions = { inc: Schema.Void, dec: Schema.Void }

// 辅助类型
export type CounterShape = Logix.Shape<typeof CounterState, typeof CounterActions>

// 2. 定义通用逻辑 (Logic Template)
// 注意：这是一个纯函数，接收绑定的 api，不依赖具体的 Runtime 实例
export const CounterLogic = (api: Logix.BoundApi<CounterShape>) =>
  Effect.gen(function*() {
    yield* api.onAction('inc').update((_, s) => ({ count: s.count + 1 }))
    yield* api.onAction('dec').update((_, s) => ({ count: s.count - 1 }))
  })
```

**第二步：创建工厂函数 (Factory)**

```typescript
// features/counter/factory.ts
import * as Logix from '@logix/core'
import { CounterState, CounterActions, CounterLogic } from './definition'

// 工厂函数：接收唯一 ID，返回一个全新的 Module 实例
export const createCounter = (id: string) => {
  // 关键：Logix.Module 内部会创建一个新的 GenericTag(`@logix/Module/${id}`)
  // 这个 Tag 是全局唯一的，代表了这个特定的计数器实例
  const module = Logix.Module.make(id, {
    state: CounterState,
    actions: CounterActions
  })

  // 挂载逻辑
  // 这里的 Logic 会运行在这个特定的 module 实例上下文中
  module.logic(CounterLogic)

  return module
}
```

**第三步：消费与协作 (Consumption)**

```typescript
// 在 App 组装层
const CounterA = createCounter('counter-user-1')
const CounterB = createCounter('counter-user-2')

// 它们拥有完全隔离的状态和 Action 通道
// 在 Link 或其他 Logic 中，可以显式区分它们
$.use(CounterA).read(s => s.count) // 读 A
$.use(CounterB).read(s => s.count) // 读 B
```

### 1.3 优势

- **心智模型统一**：与单例模式的代码结构几乎一致，只是加了个函数包装。
- **显式依赖**：在跨模块协作（Link）时，`CounterA` 和 `CounterB` 是不同的 Token，不会发生“我想操作 A 却误操作了 B”的情况。
- **架构同构**：符合 Effect 的依赖注入模型，每个实例都是一个独立的 Service。

---

## 2. 方案二：作用域模式 (Scope Pattern) [谨慎使用]

### 2.1 核心原理

使用同一个 Tag，但在 React 组件树的不同分支（Scope）上 provide 不同的 Runtime 实例。这类似 React Context 的 Shadowing 机制。

### 2.2 适用场景与局限

- **适用**：纯 UI 列表渲染（如 `state.items.map` 生成的子项），且子项逻辑**完全封闭**，不需要被外部（如全局 Link）主动操控。
- **局限**：
  - **环境隔离风险**：如果使用 `useLocalModule` 创建局部 Runtime，它可能无法继承上层的全局服务（如 Logger, Network），除非手动透传 Layer。
  - **跨模块协作困难**：外部的 Link 逻辑通常依赖 Tag 来查找 Module。如果所有实例共用一个 Tag，Link 无法区分它们，也无法指定操作某一个特定实例。

### 2.3 实现示意 (React)

```tsx
// 1. 定义通用 Token（返回 ModuleDef）
export const TodoItemDef = Logix.Module.make('TodoItem', { ... })

// 2. 在组件中隔离 Scope
export const TodoList = () => {
  return (
    <div>
      {ids.map(id => (
        // 假设有一个支持 Scope Fork 的 Provider
        <ModuleScope key={id} module={TodoItemDef} initial={{ id }}>
          <TodoItemView />
        </ModuleScope>
      ))}
    </div>
  )
}

// 3. 子组件消费
// 拿到的是最近 Scope 提供的实例
const { state } = useModule(TodoItemDef)
```

---

## 3. 选型对比与建议

| 特性           | 方案一：工厂模式 (Factory)                    | 方案二：作用域模式 (Scope)                          |
| :------------- | :-------------------------------------------- | :-------------------------------------------------- |
| **实例标识**   | **显式不同** (CounterA !== CounterB)          | **隐式覆盖** (Tag 相同，Context 不同)               |
| **跨模块访问** | **容易**。Link 可以同时引入 A 和 B 进行交互。 | **困难**。外部无法通过 Tag 定位特定实例。           |
| **生命周期**   | 通常随 App 启动，或手动控制 Scope。           | 随 React 组件挂载/卸载自动管理。                    |
| **调试体验**   | 清晰。DevTools 能看到 ID 不同的 Store。       | 稍乱。DevTools 会看到多个同名 Store，需靠层级区分。 |
| **推荐场景**   | **Dashboard Widget、分屏对比、独立业务实体**  | **纯 UI 逻辑封装、递归组件**                        |

### 最佳实践建议

**优先采用方案一（工厂模式）。**

它提供了更清晰的架构边界和类型安全。即使是动态列表场景，如果列表项有复杂的业务逻辑（如需要被外部触发更新、需要与其他模块联动），也建议在父级通过工厂创建好一组 Module 实例，再分发给子组件。

---

## 4. 场景实战：动态列表 (Dynamic List)

在“列表渲染”场景下（例如 Todo List），如果每个 Item 都需要独立的 Module 实例（工厂模式），推荐采用 **父组件管理实例生命周期** 的方式。

### 4.1 核心思路

1.  **父组件 (Container)**：负责维护 ID 列表，并使用 `useMemo` 或 `Map` 缓存 Module 实例。
2.  **子组件 (Item)**：只负责接收 Module 实例并消费。

### 4.2 代码实现

**Item 组件 (TodoItem.tsx)**

```tsx
import { useLocalModule, useSelector, useDispatch } from '@logix/react'
import { TodoItemModule } from './definition'

export const TodoItem = ({ id }: { id: string }) => {
  const runtime = useLocalModule(() => makeTodoItemModule(id), [id])
  const view = useSelector(runtime, (s) => ({ title: s.title, completed: s.completed }))
  const dispatch = useDispatch(runtime)

  return (
    <div className={view.completed ? 'done' : ''}>
      <span>{view.title}</span>
      <button onClick={() => dispatch({ _tag: 'toggle' })}>Toggle</button>
    </div>
  )
}
```

**List 组件 (TodoList.tsx)**

````tsx
import React, { useMemo } from 'react'
import { createTodoItem } from './factory'
import { TodoItem } from './TodoItem'

```tsx
import React from 'react'
import { useModuleList } from '@logix/react'
import { createTodoItem } from './factory'
import { TodoItem } from './TodoItem'

export const TodoList = ({ todos }: { todos: Array<{ id: string, title: string }> }) => {
  // 使用封装好的 Hook，代码变得非常简洁
  const itemModules = useModuleList(
    todos,
    (t) => t.id,
    (id) => createTodoItem(id)
  )

  return (
    <div>
      {itemModules.map(mod => (
        <TodoItem key={mod.id} module={mod} />
      ))}
    </div>
  )
}
````

### 4.3 进阶技巧：Root-scoped Registry（高级）

当你真的需要“在非 React 边界也能按 id 找到某个局部实例”（例如某段 processes 逻辑需要与某个 Session/Tab 对齐）时，**不要**使用进程级全局 `Map` 作为 registry：

- 它会跨多个 Runtime Tree 串实例，破坏多 root / 多实例语义；
- 清理时机不可控（尤其在 HMR/测试/多应用并存时）。

推荐做法是把 registry 作为一个 Service 提供在 **Runtime Tree 的 root layer** 中，并由“实例拥有者”（例如 Host/Coordinator）显式注册/注销，让作用域随 runtime tree 一起释放。

同时要明确：`Link.make` 只作用于它声明的 `modules` 集合（通常是“单例模块”协作），不负责“多实例选择”。多实例协作应通过显式句柄（`ModuleRef/ModuleRuntime`）透传或通过 root-scoped registry Service 进行桥接。
