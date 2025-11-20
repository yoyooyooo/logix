import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Schema from "effect/Schema"
import * as Fn from "effect/Function"
import { useEffect, useState } from "react"
import * as Store from "./store"

// UI 层 (Convenience API): 主要是 void 或 Promise，适合 JSX 事件绑定
export interface Form<A> {
  readonly values: A
  readonly errors: Record<string, string>
  readonly isSubmitting: boolean
  readonly isValid: boolean

  readonly setField: <K extends keyof A>(k: K, v: A[K]) => void
  readonly submit: () => void

  readonly source: FormStore<A>
}

export function useForm<A, I>(
  schema: Schema.Schema<A, I>,
  initialValues: A,
): Form<A> | null {
  const [form, setForm] = useState<Form<A> | null>(null)

  const [snapshot, setSnapshot] = useState<Store.FormState<A>>({
    values: initialValues,
    errors: {},
    isSubmitting: false,
    isValid: true,
  })

  useEffect(() => {
    const scope = Effect.runSync(Scope.make())

    const program = Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Scope.Scope>()

      const store = yield* Store.make(schema, initialValues)

      yield* Fn.pipe(
        store.state$,
        Stream.runForEach((state) => Effect.sync(() => setSnapshot(state))),
        Effect.forkScoped,
      )

      const uiForm: Form<A> = {
        get values() {
          return snapshot.values
        },
        get errors() {
          return snapshot.errors
        },
        get isSubmitting() {
          return snapshot.isSubmitting
        },
        get isValid() {
          return snapshot.isValid
        },
        setField: (k, v) => {
          Runtime.runSync(runtime)(store.setField(k, v))
        },
        submit: () => {
          Runtime.runFork(runtime)(store.submit)
        },
        source: store,
      }

      yield* Effect.sync(() => setForm(uiForm))
    })

    Effect.runFork(program.pipe(Effect.provideService(Scope.Scope, scope)))

    return () => {
      Effect.runFork(Scope.close(scope, Exit.void))
    }
  }, [])

  if (!form) return null

  return {
    ...form,
    values: snapshot.values,
    errors: snapshot.errors,
    isSubmitting: snapshot.isSubmitting,
    isValid: snapshot.isValid,
  }
}
