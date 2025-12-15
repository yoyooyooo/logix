import * as Logix from "@logix/core"
import { Effect, Schema } from "effect"
import { setAtPath, updateArrayAtPath, getAtPath } from "./internal/path.js"
import { traits as traitsDsl } from "./dsl/traits.js"
import { install as installLogic } from "./logics/install.js"

export type FormErrors = unknown
export type FormUiState = unknown

export type FormState<TValues extends object> = TValues & {
  readonly errors: FormErrors
  readonly ui: FormUiState
}

const FormActions = {
  setValue: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  blur: Schema.Struct({ path: Schema.String }),
  submit: Schema.Void,
  arrayAppend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayPrepend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayRemove: Schema.Struct({ path: Schema.String, index: Schema.Number }),
  arraySwap: Schema.Struct({
    path: Schema.String,
    indexA: Schema.Number,
    indexB: Schema.Number,
  }),
  arrayMove: Schema.Struct({
    path: Schema.String,
    from: Schema.Number,
    to: Schema.Number,
  }),
} as const

export type FormAction = Logix.ActionsFromMap<typeof FormActions>

export type FormShape<TValues extends object> = Logix.Shape<
  Schema.Schema<FormState<TValues>, any>,
  typeof FormActions
>

export interface FormMakeConfig<TValues extends object> {
  readonly values: Schema.Schema<TValues, any>
  readonly initialValues: TValues
  readonly mode?: "onChange" | "onBlur" | "onSubmit" | "all"
  readonly debounceMs?: number
  readonly traits?: Logix.StateTrait.StateTraitSpec<TValues>
  /**
   * listValidateOnChange：
   * - 传入数组字段路径（如 "items"）后，任意 items.<i>.<field> 的 setValue 都会触发 Ref.list("items") 的 scopedValidate，
   *   以支持“跨行互斥/联动校验”即时更新（会运行 items[] scope 的 check 全量刷新）。
   */
  readonly listValidateOnChange?: ReadonlyArray<string>
}

export interface FormBlueprint<TValues extends object> {
  readonly id: string
  readonly module: Logix.ModuleInstance<any, FormShape<TValues>>
  readonly impl: Logix.ModuleImpl<any, FormShape<TValues>, any>
  readonly initial: (values?: TValues) => FormState<TValues>
  readonly logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>>
  readonly traits?: Logix.StateTrait.StateTraitSpec<TValues>
  readonly controller: {
    readonly make: (
      runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>,
    ) => FormController<TValues>
  }
}

export interface FormController<TValues extends object> {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>
  readonly getState: Effect.Effect<FormState<TValues>>
  readonly dispatch: (action: FormAction) => Effect.Effect<void>
  readonly submit: () => Effect.Effect<void>

  readonly field: (path: string) => {
    readonly get: Effect.Effect<unknown>
    readonly set: (value: unknown) => Effect.Effect<void>
    readonly blur: () => Effect.Effect<void>
  }

  readonly array: (path: string) => {
    readonly get: Effect.Effect<ReadonlyArray<unknown>>
    readonly append: (value: unknown) => Effect.Effect<void>
    readonly prepend: (value: unknown) => Effect.Effect<void>
    readonly remove: (index: number) => Effect.Effect<void>
    readonly swap: (indexA: number, indexB: number) => Effect.Effect<void>
    readonly move: (from: number, to: number) => Effect.Effect<void>
  }
}

type AnyState = Record<string, unknown>

const isAuxRootPath = (path: string): boolean =>
  path === "errors" ||
  path === "ui" ||
  path.startsWith("errors.") ||
  path.startsWith("ui.")

type FieldUiMeta = {
  readonly touched?: boolean
  readonly dirty?: boolean
}

const mergeUiMeta = (prev: unknown, patch: FieldUiMeta): FieldUiMeta => {
  const base =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? (prev as Record<string, unknown>)
      : {}
  return {
    ...base,
    ...patch,
  }
}

const setUiMeta = (state: unknown, path: string, patch: FieldUiMeta): unknown => {
  if (!path) return state
  const prev = getAtPath(state, `ui.${path}`)
  return setAtPath(state, `ui.${path}`, mergeUiMeta(prev, patch))
}

const normalizeArrayToLength = (
  items: ReadonlyArray<unknown>,
  length: number,
): Array<unknown | undefined> => {
  const next: Array<unknown | undefined> = items.slice(0, length)
  while (next.length < length) next.push(undefined)
  return next
}

const syncAuxArrays = (
  state: AnyState,
  path: string,
  currentLength: number,
  update: (items: ReadonlyArray<unknown | undefined>) => ReadonlyArray<unknown | undefined>,
): AnyState => {
  if (!path || isAuxRootPath(path)) return state

  const apply = (root: "errors" | "ui", prev: AnyState): AnyState =>
    updateArrayAtPath(prev, `${root}.${path}`, (items) =>
      update(normalizeArrayToLength(items, currentLength)),
    ) as AnyState

  return apply("ui", apply("errors", state))
}

export const make = <Id extends string, TValues extends object>(
  id: Id,
  config: FormMakeConfig<TValues>,
): FormBlueprint<TValues> => {
  const ErrorsSchema = Schema.Unknown
  const UiSchema = Schema.Unknown

  const StateSchema = Schema.extend(
    config.values,
    Schema.Struct({
      errors: ErrorsSchema,
      ui: UiSchema,
    }),
  )

  const Actions = FormActions

  type State = Schema.Schema.Type<typeof StateSchema>
  type Reducers = Logix.ReducersFromMap<typeof StateSchema, typeof Actions>

  const reducers: Reducers = {
    setValue: (state, action) => {
      const path = action.payload.path
      const next = setAtPath(state, path, action.payload.value) as State
      if (isAuxRootPath(path)) return next
      return setUiMeta(next, path, { dirty: true }) as State
    },
    blur: (state, action) => {
      const path = action.payload.path
      if (isAuxRootPath(path)) return state as State
      return setUiMeta(state, path, { touched: true }) as State
    },
    arrayAppend: (state, action) => {
      const path = action.payload.path as string
      const value = action.payload.value
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const nextState = updateArrayAtPath(state, path, (items) => [...items, value]) as AnyState
      return syncAuxArrays(nextState, path, currentItems.length, (items) => [...items, undefined]) as State
    },
    arrayPrepend: (state, action) => {
      const path = action.payload.path as string
      const value = action.payload.value
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const nextState = updateArrayAtPath(state, path, (items) => [value, ...items]) as AnyState
      return syncAuxArrays(nextState, path, currentItems.length, (items) => [undefined, ...items]) as State
    },
    arrayRemove: (state, action) => {
      const path = action.payload.path as string
      const index = action.payload.index as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []
      const nextState = updateArrayAtPath(state, path, (items) => items.filter((_, i) => i !== index)) as AnyState
      return syncAuxArrays(
        nextState,
        path,
        currentItems.length,
        (items) => items.filter((_, i) => i !== index),
      ) as State
    },
    arraySwap: (state, action) => {
      const path = action.payload.path as string
      const a = action.payload.indexA as number
      const b = action.payload.indexB as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []

      const swap = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> => {
        const next = items.slice()
        if (a >= 0 && b >= 0 && a < next.length && b < next.length) {
          const tmp = next[a]
          next[a] = next[b]
          next[b] = tmp
        }
        return next
      }

      const nextState = updateArrayAtPath(state, path, swap) as AnyState
      return syncAuxArrays(nextState, path, currentItems.length, swap) as State
    },
    arrayMove: (state, action) => {
      const path = action.payload.path as string
      const from = action.payload.from as number
      const to = action.payload.to as number
      const current = getAtPath(state, path)
      const currentItems = Array.isArray(current) ? current : []

      const move = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> => {
        const next = items.slice()
        if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
          return next
        }
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      }

      const nextState = updateArrayAtPath(state, path, move) as AnyState
      return syncAuxArrays(nextState, path, currentItems.length, move) as State
    },
  }

  const traits = config.traits ? traitsDsl(config.values)(config.traits) : undefined

  const module = Logix.Module.make(id, {
    state: StateSchema,
    actions: Actions,
    reducers,
    traits,
  })

  const logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>> = [
    installLogic(module, {
      mode: config.mode,
      debounceMs: config.debounceMs,
      listValidateOnChange: config.listValidateOnChange,
    }),
  ]

  const initial = (values?: TValues): FormState<TValues> =>
    ({
      ...(values ?? config.initialValues),
      errors: {},
      ui: {},
    }) as FormState<TValues>

  const impl = module.implement({
    initial: initial(),
    logics: [...logics],
  })

  const controller = {
    make: (runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>): FormController<TValues> => ({
      runtime,
      getState: runtime.getState as Effect.Effect<FormState<TValues>>,
      dispatch: runtime.dispatch,
      submit: () => runtime.dispatch({ _tag: "submit", payload: undefined }),
      field: (path: string) => ({
        get: runtime.getState.pipe(Effect.map((s) => getAtPath(s, path))),
        set: (value: unknown) =>
          runtime.dispatch({ _tag: "setValue", payload: { path, value } }),
        blur: () => runtime.dispatch({ _tag: "blur", payload: { path } }),
      }),
      array: (path: string) => ({
        get: runtime.getState.pipe(
          Effect.map((s) => {
            const value = getAtPath(s, path)
            return Array.isArray(value) ? value : []
          }),
        ),
        append: (value: unknown) =>
          runtime.dispatch({ _tag: "arrayAppend", payload: { path, value } }),
        prepend: (value: unknown) =>
          runtime.dispatch({ _tag: "arrayPrepend", payload: { path, value } }),
        remove: (index: number) =>
          runtime.dispatch({ _tag: "arrayRemove", payload: { path, index } }),
        swap: (indexA: number, indexB: number) =>
          runtime.dispatch({ _tag: "arraySwap", payload: { path, indexA, indexB } }),
        move: (from: number, to: number) =>
          runtime.dispatch({ _tag: "arrayMove", payload: { path, from, to } }),
      }),
    }),
  }

  return {
    id,
    module,
    impl,
    initial,
    logics,
    traits,
    controller,
  }
}
