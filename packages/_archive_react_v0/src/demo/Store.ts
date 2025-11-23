import { create } from "zustand"
import { Context, Effect, Layer } from "effect"

interface Item {
  id: string
  name: string
}

// 1. 定义纯数据的 Store (Zustand)
interface AppState {
  items: Item[]
}
// 这里不需要 Effect，只是纯粹的 setter
export const useRawStore = create<AppState>(() => ({ items: [] }))

// 2. 定义业务逻辑层 (Effect Service)
interface TodoService {
  addItem: (text: string) => Effect.Effect<void>
}
export class TodoServiceTag extends Context.Tag("TodoService")<
  TodoServiceTag,
  TodoService
>() {}

// 3. 实现层：Effect 驱动 Zustand 更新
export const TodoServiceLive = Layer.succeed(TodoServiceTag, {
  addItem: (text: string) =>
    Effect.sync(() => {
      // 在 Effect 逻辑中直接操作 Zustand
      useRawStore.setState((prev: AppState) => ({
        items: [...prev.items, { id: Date.now().toString(), name: text }],
      }))
    }),
})

// 4. 在组件中使用
// UI 使用 useRawStore 获取数据 (Reactive)
// UI 使用 TodoService 里的方法，通过 Effect.runPromise 触发 (Imperative)
