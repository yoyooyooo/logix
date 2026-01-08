import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'
import { getAtPath } from './path.js'
import { toSchemaErrorTree } from '../../SchemaErrorMapping.js'
import { isAuxRootPath } from './arrays.js'
import { readErrorCount } from './errors.js'

export const makeFormController = <TValues extends object>(params: {
  readonly runtime: Logix.ModuleRuntime<any, any>
  readonly shape: unknown
  readonly valuesSchema: Schema.Schema<TValues, any>
}): any => {
  const runtime = params.runtime
  const bound = Logix.Bound.make(params.shape as any, runtime as any)

  return {
    runtime,
    getState: runtime.getState as Effect.Effect<any>,
    dispatch: runtime.dispatch,
    submit: () => runtime.dispatch({ _tag: 'submit', payload: undefined }),
    controller: {
      validate: () =>
        Effect.gen(function* () {
          yield* Logix.TraitLifecycle.scopedValidate(bound as any, {
            mode: 'manual',
            target: Logix.TraitLifecycle.Ref.root(),
          })

          const state = yield* runtime.getState
          const { errors: _errors, ui: _ui, $form: _meta, ...values } = state as any
          const decoded = Schema.decodeUnknownEither(params.valuesSchema)(values as any) as any
          const schemaTree = decoded._tag === 'Right' ? {} : toSchemaErrorTree(decoded.left)

          yield* runtime.dispatch({
            _tag: 'setValue',
            payload: { path: 'errors.$schema', value: schemaTree },
          })
        }),
      validatePaths: (paths: ReadonlyArray<string> | string) =>
        Effect.gen(function* () {
          const list = typeof paths === 'string' ? [paths] : paths
          if (!list || list.length === 0) return
          const state = yield* runtime.getState

          for (const raw of list) {
            if (typeof raw !== 'string') continue
            const path = raw.trim()
            if (!path || isAuxRootPath(path)) continue

            const value = getAtPath(state, path)
            const target = Array.isArray(value)
              ? Logix.TraitLifecycle.Ref.list(path)
              : Logix.TraitLifecycle.Ref.fromValuePath(path)

            yield* Logix.TraitLifecycle.scopedValidate(bound as any, {
              mode: 'manual',
              target,
            })
          }
        }),
      reset: (values?: TValues) => runtime.dispatch({ _tag: 'reset', payload: values as any }),
      setError: (path: string, error: unknown) => runtime.dispatch({ _tag: 'setError', payload: { path, error } }),
      clearErrors: (paths?: ReadonlyArray<string> | string) =>
        runtime.dispatch({
          _tag: 'clearErrors',
          payload: paths === undefined ? undefined : typeof paths === 'string' ? [paths] : (paths as any),
        }),
      handleSubmit: (handlers: any) =>
        Effect.gen(function* () {
          yield* runtime.dispatch({ _tag: 'submitAttempt', payload: undefined })
          yield* runtime.dispatch({ _tag: 'setSubmitting', payload: true })

          yield* Logix.TraitLifecycle.scopedValidate(bound as any, {
            mode: 'submit',
            target: Logix.TraitLifecycle.Ref.root(),
          })

          const stateAfterRules = yield* runtime.getState
          const {
            errors: _errorsAfterRules,
            ui: _uiAfterRules,
            $form: _metaAfterRules,
            ...valuesAfterRules
          } = stateAfterRules as any
          const decoded = Schema.decodeUnknownEither(params.valuesSchema)(valuesAfterRules as any) as any
          const schemaTree = decoded._tag === 'Right' ? {} : toSchemaErrorTree(decoded.left)

          yield* runtime.dispatch({
            _tag: 'setValue',
            payload: { path: 'errors.$schema', value: schemaTree },
          })

          const state = yield* runtime.getState
          const errorCount = readErrorCount(state)

          if (errorCount > 0) {
            if (handlers.onInvalid) {
              yield* handlers.onInvalid((state as any).errors)
            }
            return
          }

          const { errors: _errorsFinal, ui: _uiFinal, $form: _metaFinal, ...valuesFinal } = state as any
          yield* handlers.onValid(valuesFinal as TValues)
        }).pipe(Effect.ensuring(runtime.dispatch({ _tag: 'setSubmitting', payload: false }))),
    },
    field: (path: string) => ({
      get: runtime.getState.pipe(Effect.map((s: any) => getAtPath(s, path))),
      set: (value: unknown) => runtime.dispatch({ _tag: 'setValue', payload: { path, value } }),
      blur: () => runtime.dispatch({ _tag: 'blur', payload: { path } }),
    }),
    fieldArray: (path: string) => ({
      get: runtime.getState.pipe(
        Effect.map((s: any) => {
          const value = getAtPath(s, path)
          return Array.isArray(value) ? value : []
        }),
      ),
      append: (value: unknown) => runtime.dispatch({ _tag: 'arrayAppend', payload: { path, value } }),
      prepend: (value: unknown) => runtime.dispatch({ _tag: 'arrayPrepend', payload: { path, value } }),
      remove: (index: number) => runtime.dispatch({ _tag: 'arrayRemove', payload: { path, index } }),
      swap: (indexA: number, indexB: number) =>
        runtime.dispatch({ _tag: 'arraySwap', payload: { path, indexA, indexB } }),
      move: (from: number, to: number) => runtime.dispatch({ _tag: 'arrayMove', payload: { path, from, to } }),
    }),
  }
}
