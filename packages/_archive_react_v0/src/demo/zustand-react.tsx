import { create } from "zustand"
import { Context, Effect, Layer } from "effect"

interface MyState {
  count: number
  increase: () => void
}

const useMyStore = create<MyState>((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 }))
}))
const useMyStore2 = create<MyState>((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 2 }))
}))

class MyStore extends Context.Tag("MyStore")<MyStore, typeof useMyStore>() {}

const MyStoreLive = Layer.succeed(MyStore, useMyStore)
const MyStoreLive2 = Layer.succeed(MyStore, useMyStore2)

const increaseCount = Effect.gen(function* (_) {
  const useMyStore = yield* _(MyStore)
  useMyStore.getState().increase()
})

export default function MyComponent() {
  const count = useMyStore((state) => state.count)
  const count2 = useMyStore2((state) => state.count)
  const increase = () => {
    void Effect.runPromise(Effect.provide(increaseCount, MyStoreLive))
  }
  const increase2 = () => {
    void Effect.runPromise(Effect.provide(increaseCount, MyStoreLive2))
  }
  const increase3 = () => {
    void increaseCount.pipe(
      Effect.provideService(MyStore, useMyStore2),
      Effect.runPromise
    )
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Count2: {count2}</p>
      <button onClick={increase}>Increase</button>
      <button onClick={increase2}>Increase2</button>
      <button onClick={increase3}>Increase3</button>
    </div>
  )
}
