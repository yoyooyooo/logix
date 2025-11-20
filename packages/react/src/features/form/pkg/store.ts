import * as Effect from "effect/Effect"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import * as Schema from "effect/Schema"
import * as ParseResult from "effect/ParseResult"
import * as Fn from "effect/Function"

export interface FormState<A> {
  values: A
  errors: Record<string, string>
  isSubmitting: boolean
  isValid: boolean
}

// 内核层 (Power API): 纯 Effect，适合组合、测试、逻辑编排
export interface FormStore<A> {
  readonly state$: Stream.Stream<FormState<A>>
  readonly values$: Stream.Stream<A>
  readonly errors$: Stream.Stream<Record<string, string>>

  readonly setField: <K extends keyof A>(k: K, v: A[K]) => Effect.Effect<void>
  readonly submit: Effect.Effect<void>
  readonly validate: Effect.Effect<boolean>
}

// 基础构造函数：后续通过 `Store.make` 使用
export const make = <A, I>(
  schema: Schema.Schema<A, I>,
  initialValues: A,
): Effect.Effect<FormStore<A>, never, Scope.Scope> => {
  return Effect.gen(function* () {
    const initialState: FormState<A> = {
      values: initialValues,
      errors: {},
      isSubmitting: false,
      isValid: true,
    }

    const stateRef = yield* SubscriptionRef.make(initialState)

    const setField = <K extends keyof A>(k: K, v: A[K]) =>
      SubscriptionRef.update(stateRef, (s) => ({
        ...s,
        values: { ...s.values, [k]: v },
      }))

    const validate = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      const result = Schema.decodeUnknownEither(schema)(state.values)

      if (result._tag === "Left") {
        const errorsArray = ParseResult.ArrayFormatter.formatErrorSync(result.left)
        const errors: Record<string, string> = {}

        for (const e of errorsArray) {
          const key = String(e.path[e.path.length - 1] ?? "root")
          errors[key] = e.message
        }

        yield* SubscriptionRef.update(stateRef, (s) => ({
          ...s,
          errors,
          isValid: false,
        }))
        return false
      }

      yield* SubscriptionRef.update(stateRef, (s) => ({
        ...s,
        errors: {},
        isValid: true,
      }))
      return true
    })

    const submit = Effect.gen(function* () {
      yield* SubscriptionRef.update(stateRef, (s) => ({
        ...s,
        isSubmitting: true,
      }))

      yield* validate

      yield* SubscriptionRef.update(stateRef, (s) => ({
        ...s,
        isSubmitting: false,
      }))
    })

    // 自动校验流：监听 values 变化，防抖后触发校验
    yield* Fn.pipe(
      stateRef.changes,
      Stream.map((s) => s.values),
      Stream.changes,
      Stream.debounce("200 millis"),
      Stream.tap(() => validate),
      Stream.runDrain,
      Effect.forkScoped,
    )

    return {
      state$: stateRef.changes,
      values$: stateRef.changes.pipe(Stream.map((s) => s.values)),
      errors$: stateRef.changes.pipe(Stream.map((s) => s.errors)),
      setField,
      submit,
      validate,
    }
  })
}
