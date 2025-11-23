import {
  Effect,
  Stream,
  SubscriptionRef,
  Schema,
  pipe,
  Duration,
} from "effect"
import { ArrayFormatter } from "effect/ParseResult"
import { get, set } from "./utils/object-utils"

// ---------------------------------------------------------
// 1. 核心类型定义
// ---------------------------------------------------------

export interface FormState<A> {
  values: A
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  submitCount: number
}

export type ValidationMode = "onChange" | "onBlur" | "onSubmit" | "all"

export interface FormOptions {
  mode?: ValidationMode
  reValidateMode?: ValidationMode
  debounce?: Duration.DurationInput
}

export interface FormStore<A> {
  readonly state$: Stream.Stream<FormState<A>>
  readonly values$: Stream.Stream<A>
  readonly errors$: Stream.Stream<Record<string, string>>
  readonly getState: Effect.Effect<FormState<A>>
  readonly getValues: Effect.Effect<A>
  readonly setValidationOptions: (options: Partial<Pick<FormOptions, "mode" | "reValidateMode">>) => Effect.Effect<void>
  
  // Actions
  readonly setPath: (path: string, value: unknown) => Effect.Effect<void>
  readonly setPathTouched: (path: string, isTouched: boolean) => Effect.Effect<void>
  
  // Array Actions
  readonly arrayPush: (path: string, item: unknown) => Effect.Effect<void>
  readonly arrayRemove: (path: string, index: number) => Effect.Effect<void>
  readonly arraySwap: (path: string, indexA: number, indexB: number) => Effect.Effect<void>

  readonly submit: Effect.Effect<boolean>
  readonly validate: Effect.Effect<boolean>
  readonly reset: Effect.Effect<void>
  
  // Daemon: 校验流
  readonly runValidation: Effect.Effect<void>
}

// ---------------------------------------------------------
// 2. 核心逻辑实现 (make)
// ---------------------------------------------------------

export const make = <A, I>(
  schema: Schema.Schema<A, I>,
  initialValues: A,
  options: FormOptions = {}
): Effect.Effect<FormStore<A>> => {
  return Effect.gen(function* () {
    const { mode = "onChange", reValidateMode = "onChange", debounce = "200 millis" } = options

    const initialState: FormState<A> = {
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false,
      submitCount: 0
    }

    // SubscriptionRef.make 是同步的
    const stateRef = yield* SubscriptionRef.make(initialState)
    const revalidateRef = yield* SubscriptionRef.make(false)
    const modeRef = yield* SubscriptionRef.make<ValidationMode>(mode)
    const revalidateModeRef = yield* SubscriptionRef.make<ValidationMode>(reValidateMode)

    const resolveMode = Effect.gen(function* () {
      const currentMode = yield* SubscriptionRef.get(modeRef)
      const currentRevalidate = yield* SubscriptionRef.get(revalidateModeRef)
      const isRevalidate = yield* SubscriptionRef.get(revalidateRef)
      return isRevalidate ? (currentRevalidate ?? currentMode) : currentMode
    })

    // --- Internal Helpers ---

    const validate = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      const result = Schema.decodeUnknownEither(schema)(state.values)

      if (result._tag === "Left") {
        const errorsArray = ArrayFormatter.formatErrorSync(result.left)
        const errors: Record<string, string> = {}
        for (const e of errorsArray) {
          const key = e.path.map(String).join(".") || "root"
          errors[key] = e.message
        }
        
        yield* SubscriptionRef.update(stateRef, s => ({ ...s, errors, isValid: false }))
        return false
      } else {
        yield* SubscriptionRef.update(stateRef, s => ({ ...s, errors: {}, isValid: true }))
        return true
      }
    })

    // --- Actions ---

    const setPath = (path: string, value: unknown) =>
      SubscriptionRef.update(stateRef, (s) => {
        const newValues = set(s.values, path, value)
        return {
          ...s,
          values: newValues,
          isDirty: true
        }
      })

    const setPathTouched = (path: string, isTouched: boolean) =>
      SubscriptionRef.update(stateRef, (s) => ({
        ...s,
        touched: { ...s.touched, [path]: isTouched }
      }))

    // --- Array Actions ---

    const arrayPush = (path: string, item: unknown) => 
      SubscriptionRef.update(stateRef, (s) => {
        const currentArray = get(s.values, path, []) as unknown[]
        if (!Array.isArray(currentArray)) return s
        
        const newArray = [...currentArray, item]
        const newValues = set(s.values, path, newArray)
        return { ...s, values: newValues, isDirty: true }
      })

    const arrayRemove = (path: string, index: number) =>
      SubscriptionRef.update(stateRef, (s) => {
        const currentArray = get(s.values, path, []) as unknown[]
        if (!Array.isArray(currentArray)) return s

        const newArray = [...currentArray]
        newArray.splice(index, 1)
        const newValues = set(s.values, path, newArray)
        return { ...s, values: newValues, isDirty: true }
      })

    const arraySwap = (path: string, indexA: number, indexB: number) =>
      SubscriptionRef.update(stateRef, (s) => {
        const currentArray = get(s.values, path, []) as unknown[]
        if (!Array.isArray(currentArray)) return s

        const newArray = [...currentArray]
        const temp = newArray[indexA]
        newArray[indexA] = newArray[indexB]
        newArray[indexB] = temp
        
        const newValues = set(s.values, path, newArray)
        return { ...s, values: newValues, isDirty: true }
      })

    const submit = Effect.gen(function* () {
      yield* SubscriptionRef.update(stateRef, s => ({ ...s, isSubmitting: true, submitCount: s.submitCount + 1 }))
      
      const isValid = yield* validate
      yield* SubscriptionRef.set(revalidateRef, !isValid)
      yield* SubscriptionRef.update(stateRef, s => ({ ...s, isSubmitting: false }))

      return isValid
    })

    const reset = Effect.gen(function* () {
      yield* SubscriptionRef.set(stateRef, initialState)
      yield* SubscriptionRef.set(revalidateRef, false)
      yield* SubscriptionRef.set(modeRef, mode)
      yield* SubscriptionRef.set(revalidateModeRef, reValidateMode)
    })

    const setValidationOptions = (opts: Partial<Pick<FormOptions, "mode" | "reValidateMode">>) =>
      Effect.gen(function* () {
        if (opts.mode) {
          yield* SubscriptionRef.set(modeRef, opts.mode)
        }
        if (opts.reValidateMode) {
          yield* SubscriptionRef.set(revalidateModeRef, opts.reValidateMode)
        }
      })

    // --- Validation Streams (Definition Only) ---

    const filterByMode = (predicate: (m: ValidationMode) => boolean) =>
      Stream.filterEffect(() =>
        pipe(
          resolveMode,
          Effect.map((modeValue) => predicate(modeValue))
        )
      )

    const changeTrigger$ = pipe(
      stateRef.changes,
      Stream.map(s => s.values),
      Stream.changes,
      Stream.debounce(debounce),
      filterByMode((m) => m === "onChange" || m === "all")
    )

    const blurTrigger$ = pipe(
      stateRef.changes,
      Stream.map(s => s.touched),
      Stream.changes,
      filterByMode((m) => m === "onBlur" || m === "all")
    )

    // 校验流：由运行时决定何时启动
    const runValidation = pipe(
      Stream.merge(changeTrigger$, blurTrigger$),
      Stream.tap(() => validate),
      Stream.runDrain
    )

    return {
      state$: stateRef.changes,
      values$: stateRef.changes.pipe(Stream.map(s => s.values)),
      errors$: stateRef.changes.pipe(Stream.map(s => s.errors)),
      getState: SubscriptionRef.get(stateRef),
      getValues: pipe(SubscriptionRef.get(stateRef), Effect.map((s) => s.values)),
      setValidationOptions,
      setPath,
      setPathTouched,
      arrayPush,
      arrayRemove,
      arraySwap,
      submit,
      validate,
      reset,
      runValidation
    }
  })
}
