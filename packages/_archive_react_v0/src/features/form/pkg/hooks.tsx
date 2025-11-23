import { Effect, Exit, Scope, Stream, Runtime, Schema, Fiber } from 'effect'
import type { FormStore, FormState, FormOptions } from './core'
import { make } from './core'
import { useEffect, useCallback, useRef, useState } from 'react'
import { useForceUpdate } from './use-force-update'
import { get } from './utils/object-utils'

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

export interface FormControl<A> {
  store: FormStore<A>
  runtime: Runtime.Runtime<Scope.Scope>
}

type ChangeEvent =
  | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  | string
  | number
  | boolean
  | null

export interface UseFormReturn<A> {
  control: FormControl<A> | null
  register: (name: string) => {
    name: string
    onChange: (e: ChangeEvent) => void
    onBlur: () => void
    ref: (el: HTMLElement | null) => void
  }
  handleSubmit: (onSubmit: (values: A) => void) => (e?: React.FormEvent) => void
  getValues: () => A | null
}

// ---------------------------------------------------------
// useForm (Headless)
// ---------------------------------------------------------

export function useForm<A, I>(schema: Schema.Schema<A, I>, initialValues: A, options?: FormOptions): UseFormReturn<A> {
  const controlRef = useRef<FormControl<A> | null>(null)
  const forceUpdate = useForceUpdate()

  // 根据最新 options 创建 Store（异步）
  useEffect(() => {
    const scope = Effect.runSync(Scope.make())

    const program = Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Scope.Scope>()
      const store = yield* make(schema, initialValues, options)
      yield* Effect.sync(() => {
        controlRef.current = { store, runtime }
        forceUpdate()
      })
      // 启动校验流
      yield* Effect.forkScoped(store.runValidation)
    })

    Effect.runFork(program.pipe(Effect.provideService(Scope.Scope, scope)))

    return () => {
      Effect.runFork(Scope.close(scope, Exit.void))
    }
    // 仅 schema/初始值/防抖变化时重建
  }, [forceUpdate, schema, initialValues, options?.debounce])

  // mode / reValidateMode 变更时直接下发到 store，避免重建
  useEffect(() => {
    if (!controlRef.current) return
    const mode = options?.mode
    const reValidateMode = options?.reValidateMode
    if (mode || reValidateMode) {
      const effect = controlRef.current.store.setValidationOptions({ mode, reValidateMode })
      Runtime.runFork(controlRef.current.runtime)(effect)
    }
  }, [options?.mode, options?.reValidateMode])

  // --- Helpers ---

  const register = useCallback((name: string) => {
    const control = controlRef.current
    if (!control) {
      return { name, onChange: () => {}, onBlur: () => {}, ref: () => {} }
    }

    return {
      name,
      onChange: (e: ChangeEvent) => {
        let value: unknown = e

        if (e && typeof e === 'object' && 'target' in e) {
          value = e.target.value
          if ('checked' in e.target && e.target.type === 'checkbox') {
            value = (e.target as HTMLInputElement).checked
          }
        }

        Runtime.runFork(control.runtime)(control.store.setPath(name, value))
      },
      onBlur: () => {
        Runtime.runFork(control.runtime)(control.store.setPathTouched(name, true))
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ref: (_el: HTMLElement | null) => {},
    }
  }, [])

  const handleSubmit = useCallback((onSubmit: (values: A) => void) => {
    return (e?: React.FormEvent) => {
      e?.preventDefault()

      const control = controlRef.current
      if (!control) return

      const submitEffect = Effect.gen(function* () {
        const isValid = yield* control.store.submit
        if (isValid) {
          const state = yield* control.store.getState
          onSubmit(state.values)
        }
      })

      Runtime.runFork(control.runtime)(submitEffect)
    }
  }, [])

  const getValues = useCallback(() => {
    const control = controlRef.current
    if (!control) return null
    return Runtime.runSync(control.runtime)(control.store.getValues)
  }, [])

  return {
    control: controlRef.current,
    register,
    handleSubmit,
    getValues,
  }
}

// ---------------------------------------------------------
// useField (Fine-grained Subscription)
// ---------------------------------------------------------

export interface UseFieldReturn<T> {
  value: T
  error?: string
  isTouched: boolean
  handleChange: (value: T) => void
  handleBlur: () => void
}

export function useField<A, T = unknown>(control: FormControl<A> | null, name: string): UseFieldReturn<T> | null {
  const [state, setState] = useState<{ value: T; error?: string; isTouched: boolean } | null>(() => {
    if (!control) return null
    const snapshot = Runtime.runSync(control.runtime)(control.store.getState)
    return {
      value: get(snapshot.values, name) as T,
      error: snapshot.errors[name],
      isTouched: !!snapshot.touched[name],
    }
  })

  useEffect(() => {
    if (!control) return

    const snapshot = Runtime.runSync(control.runtime)(control.store.getState)
    setState({
      value: get(snapshot.values, name) as T,
      error: snapshot.errors[name],
      isTouched: !!snapshot.touched[name],
    })

    const stream = control.store.state$.pipe(
      Stream.map((s) => ({
        value: get(s.values, name) as T,
        error: s.errors[name],
        isTouched: !!s.touched[name],
      })),
      Stream.changesWith(
        (prev, next) =>
          Object.is(prev.value, next.value) && prev.error === next.error && prev.isTouched === next.isTouched,
      ),
      Stream.drop(1) // 初始快照已写入 state，跳过首个重复推送
    )

    const fiber = Effect.runFork(Stream.runForEach(stream, (s) => Effect.sync(() => setState(s))))

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [control, name])

  if (!control || !state) return null

  return {
    value: state.value,
    error: state.error,
    isTouched: state.isTouched,
    handleChange: (val: T) => {
      Runtime.runFork(control.runtime)(control.store.setPath(name, val))
    },
    handleBlur: () => {
      Runtime.runFork(control.runtime)(control.store.setPathTouched(name, true))
    },
  }
}

// ---------------------------------------------------------
// useFieldArray (New Feature)
// ---------------------------------------------------------

export interface UseFieldArrayReturn<T> {
  fields: T[]
  append: (item: T) => void
  remove: (index: number) => void
  swap: (indexA: number, indexB: number) => void
}

export function useFieldArray<A, T = unknown>(control: FormControl<A> | null, name: string): UseFieldArrayReturn<T> {
  const field = useField<A, T[]>(control, name)

  const fields = field?.value || []

  const append = useCallback(
    (item: T) => {
      if (!control) return
      Runtime.runFork(control.runtime)(control.store.arrayPush(name, item))
    },
    [control, name],
  )

  const remove = useCallback(
    (index: number) => {
      if (!control) return
      Runtime.runFork(control.runtime)(control.store.arrayRemove(name, index))
    },
    [control, name],
  )

  const swap = useCallback(
    (indexA: number, indexB: number) => {
      if (!control) return
      Runtime.runFork(control.runtime)(control.store.arraySwap(name, indexA, indexB))
    },
    [control, name],
  )

  return {
    fields,
    append,
    remove,
    swap,
  }
}

// ---------------------------------------------------------
// useFormState
// ---------------------------------------------------------

export function useFormState<A>(control: FormControl<A> | null) {
  const [state, setState] = useState<Pick<FormState<A>, 'isSubmitting' | 'isValid' | 'isDirty' | 'submitCount'>>(() => {
    if (!control) return { isSubmitting: false, isValid: true, isDirty: false, submitCount: 0 }
    const snapshot = Runtime.runSync(control.runtime)(control.store.getState)
    return {
      isSubmitting: snapshot.isSubmitting,
      isValid: snapshot.isValid,
      isDirty: snapshot.isDirty,
      submitCount: snapshot.submitCount,
    }
  })

  useEffect(() => {
    if (!control) return

    const snapshot = Runtime.runSync(control.runtime)(control.store.getState)
    setState({
      isSubmitting: snapshot.isSubmitting,
      isValid: snapshot.isValid,
      isDirty: snapshot.isDirty,
      submitCount: snapshot.submitCount,
    })

    const stream = control.store.state$.pipe(
      Stream.map((s) => ({
        isSubmitting: s.isSubmitting,
        isValid: s.isValid,
        isDirty: s.isDirty,
        submitCount: s.submitCount,
      })),
      Stream.changesWith(
        (prev, next) =>
          prev.isSubmitting === next.isSubmitting &&
          prev.isValid === next.isValid &&
          prev.isDirty === next.isDirty &&
          prev.submitCount === next.submitCount,
      ),
      Stream.drop(1)
    )

    const fiber = Effect.runFork(Stream.runForEach(stream, (s) => Effect.sync(() => setState(s))))

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [control])

  return state
}

// ---------------------------------------------------------
// Components
// ---------------------------------------------------------

export interface FieldProps<A, T = unknown> {
  control: FormControl<A> | null
  name: string
  children: (field: UseFieldReturn<T>) => React.ReactNode
}

export function Field<A, T = unknown>({ control, name, children }: FieldProps<A, T>) {
  const field = useField<A, T>(control, name)
  if (!field) return null
  return <>{children(field)}</>
}
