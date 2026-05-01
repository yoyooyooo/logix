import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import { getAtPath } from './path.js'
import { toSchemaErrorTree } from '../../SchemaErrorMapping.js'
import type { SchemaError } from '../../SchemaPathMapping.js'
import type { FormErrorLeaf } from '../../Error.js'
import { literalToken } from '../validators/builtinMessageTokens.js'
import { isAuxRootPath } from './arrays.js'
import { getRowIdStore, getTrackByForListPath } from './rowid.js'
import { countPendingLeaves, countPendingLeavesWithPolicy, makeSubmitAttemptSnapshot, readErrorCount } from './errors.js'

type SubmitHookResult = Effect.Effect<void, any, any> | Promise<void> | void

export type EffectfulFieldRule = Readonly<{
  readonly path: string
  readonly inputPath?: string
  readonly errorPath?: string
  readonly ruleId: string
  readonly validate: (input: unknown, ctx: unknown) => unknown
}>

export type EffectfulListItemRule = Readonly<{
  readonly listPath: string
  readonly ruleId: string
  readonly validate: (input: unknown, ctx: unknown) => unknown
}>

export type EffectfulListRule = Readonly<{
  readonly listPath: string
  readonly ruleId: string
  readonly validate: (input: unknown, ctx: unknown) => unknown
}>

const isI18nMessageToken = (value: unknown): value is FormErrorLeaf['message'] =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (value as Record<string, unknown>)._tag === 'i18n' &&
  typeof (value as Record<string, unknown>).key === 'string'

const isFormErrorLeaf = (value: unknown): value is FormErrorLeaf => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    (record.origin === 'rule' || record.origin === 'decode' || record.origin === 'manual' || record.origin === 'submit') &&
    (record.severity === 'error' || record.severity === 'warning') &&
    isI18nMessageToken(record.message)
  )
}

const lowerRuleError = (value: unknown): FormErrorLeaf | undefined => {
  if (value === undefined || value === null) return undefined
  if (isFormErrorLeaf(value)) return value
  if (isI18nMessageToken(value)) {
    return {
      origin: 'rule',
      severity: 'error',
      message: value,
    }
  }
  return {
    origin: 'rule',
    severity: 'error',
    message: literalToken(typeof value === 'string' ? value : 'invalid'),
  }
}

const lowerListItemRuleError = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined
  if (isFormErrorLeaf(value) || isI18nMessageToken(value) || typeof value !== 'object' || Array.isArray(value)) {
    const leaf = lowerRuleError(value)
    return leaf ? { $item: leaf } : undefined
  }

  const patch = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, lowerRuleError(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined),
  )
  return Object.keys(patch).length === 0 ? undefined : patch
}

const runHook = (result: SubmitHookResult): Effect.Effect<void, any, any> => {
  if (Effect.isEffect(result)) return result
  if (result && typeof (result as Promise<void>).then === 'function') {
    return Effect.promise(() => result as Promise<void>)
  }
  return Effect.void
}

const readSubmitCount = (state: unknown): number => {
  const form = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
  const value = form && typeof form === 'object' && !Array.isArray(form) ? form.submitCount : undefined
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const isCurrentSubmitAttempt = (state: unknown, attemptSeq: number): boolean => readSubmitCount(state) === attemptSeq

const clearSubmittingIfCurrent = (
  runtime: Logix.ModuleRuntime<any, any>,
  attemptSeq: number,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const state = yield* runtime.getState
    if (!isCurrentSubmitAttempt(state, attemptSeq)) return
    yield* runtime.dispatch({ _tag: 'setSubmitting', payload: false })
  }).pipe(Effect.catchCause(() => Effect.void))

export type SubmitVerdict<TDecoded> =
  | Readonly<{
      readonly ok: true
      readonly decoded: TDecoded
    }>
  | Readonly<{
      readonly ok: false
      readonly errors: unknown
    }>

export interface FormHandle<TValues extends object, TDecoded = TValues> {
  readonly validate: () => Effect.Effect<void, never, any>
  readonly validatePaths: (paths: ReadonlyArray<string> | string) => Effect.Effect<void, never, any>
  readonly submit: (options?: {
    readonly onValid?: (decoded: TDecoded, ctx: { readonly values: TValues }) => SubmitHookResult
    readonly onInvalid?: (errors: unknown) => SubmitHookResult
  }) => Effect.Effect<SubmitVerdict<TDecoded>, any, any>
  readonly reset: (values?: TValues) => Effect.Effect<void>
  readonly setError: (path: string, error: FormErrorLeaf) => Effect.Effect<void>
  readonly clearErrors: (paths?: ReadonlyArray<string> | string) => Effect.Effect<void>
  readonly field: (path: string) => {
    readonly set: (value: unknown) => Effect.Effect<void>
    readonly blur: () => Effect.Effect<void>
  }
  readonly fieldArray: (path: string) => {
    readonly append: (value: unknown) => Effect.Effect<void>
    readonly prepend: (value: unknown) => Effect.Effect<void>
    readonly insert: (index: number, value: unknown) => Effect.Effect<void>
    readonly update: (index: number, value: unknown) => Effect.Effect<void>
    readonly replace: (nextItems: ReadonlyArray<unknown>) => Effect.Effect<void>
    readonly remove: (index: number) => Effect.Effect<void>
    readonly swap: (indexA: number, indexB: number) => Effect.Effect<void>
    readonly move: (from: number, to: number) => Effect.Effect<void>
    readonly byRowId: (rowId: string) => {
      readonly update: (value: unknown) => Effect.Effect<void>
      readonly remove: () => Effect.Effect<void>
    }
  }
}

export const makeFormHandle = <TValues extends object, TDecoded = TValues>(params: {
  readonly runtime: Logix.ModuleRuntime<any, any>
  readonly shape: unknown
  readonly valuesSchema: Schema.Schema<TValues>
  readonly submitSchema?: Schema.Schema<TDecoded>
  readonly sourceSubmitImpactByPath?: ReadonlyMap<string, 'block' | 'observe'>
  readonly flushSubmitSources?: () => Effect.Effect<void, never, any>
  readonly effectfulFieldRules?: ReadonlyArray<EffectfulFieldRule>
  readonly effectfulListItemRules?: ReadonlyArray<EffectfulListItemRule>
  readonly effectfulListRules?: ReadonlyArray<EffectfulListRule>
}): FormHandle<TValues, TDecoded> & Record<string, unknown> => {
  const runtime = params.runtime
  const bound = FieldContracts.makeBound(params.shape as any, runtime as any)
  const submitSchema = (params.submitSchema ?? params.valuesSchema) as Schema.Schema<TDecoded>

  return {
    validate: () =>
      Effect.gen(function* () {
        yield* FieldContracts.fieldScopedValidate(bound as any, {
          mode: 'manual',
          target: FieldContracts.fieldRef.root(),
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
            ? FieldContracts.fieldRef.list(path)
            : FieldContracts.fieldRef.fromValuePath(path)

          yield* FieldContracts.fieldScopedValidate(bound as any, {
            mode: 'manual',
            target,
          })
        }
      }),
    submit: (options) => {
      let attemptSeq = 0
      return Effect.gen(function* () {
        yield* runtime.dispatch({ _tag: 'submitAttempt', payload: undefined })
        const stateAfterAttemptStart = yield* runtime.getState
        attemptSeq = readSubmitCount(stateAfterAttemptStart)
        yield* runtime.dispatch({ _tag: 'setSubmitting', payload: true })

        if (params.flushSubmitSources) {
          yield* params.flushSubmitSources()
        }

        yield* FieldContracts.fieldScopedValidate(bound as any, {
          mode: 'submit',
          target: FieldContracts.fieldRef.root(),
        })

        if (params.effectfulFieldRules && params.effectfulFieldRules.length > 0) {
          const stateForEffectfulRules = yield* runtime.getState
          for (const rule of params.effectfulFieldRules) {
            const input =
              rule.inputPath === '$root'
                ? stateForEffectfulRules
                : getAtPath(stateForEffectfulRules, rule.inputPath ?? rule.path)
            const out = rule.validate(input, {
              mode: 'submit',
              state: stateForEffectfulRules,
              scope: { fieldPath: rule.path },
            })
            if (!Effect.isEffect(out)) continue
            const result = yield* out
            const stateBeforeRuleWrite = yield* runtime.getState
            if (!isCurrentSubmitAttempt(stateBeforeRuleWrite, attemptSeq)) {
              return {
                ok: false,
                errors: (stateBeforeRuleWrite as any).errors,
              } satisfies SubmitVerdict<TDecoded>
            }
            const nextInput =
              rule.inputPath === '$root'
                ? stateBeforeRuleWrite
                : getAtPath(stateBeforeRuleWrite, rule.inputPath ?? rule.path)
            if (!Object.is(nextInput, input)) continue
            yield* runtime.dispatch({
              _tag: 'setValue',
              payload: {
                path: rule.errorPath ?? `errors.${rule.path}`,
                value: lowerRuleError(result),
              },
            })
          }
        }

        if (params.effectfulListItemRules && params.effectfulListItemRules.length > 0) {
          const stateForEffectfulRules = yield* runtime.getState
          for (const rule of params.effectfulListItemRules) {
            const items = getAtPath(stateForEffectfulRules, rule.listPath)
            if (!Array.isArray(items)) continue
            for (let index = 0; index < items.length; index++) {
              const input = items[index]
              const out = rule.validate(input, {
                mode: 'submit',
                state: stateForEffectfulRules,
                scope: {
                  fieldPath: `${rule.listPath}[]`,
                  listPath: rule.listPath,
                  index,
                },
              })
              if (!Effect.isEffect(out)) continue
              const result = yield* out
              const stateBeforeRuleWrite = yield* runtime.getState
              if (!isCurrentSubmitAttempt(stateBeforeRuleWrite, attemptSeq)) {
                return {
                  ok: false,
                  errors: (stateBeforeRuleWrite as any).errors,
                } satisfies SubmitVerdict<TDecoded>
              }
              const currentItems = getAtPath(stateBeforeRuleWrite, rule.listPath)
              if (!Array.isArray(currentItems) || !Object.is(currentItems[index], input)) continue
              const patch = lowerListItemRuleError(result)
              yield* runtime.dispatch({
                _tag: 'setValue',
                payload: {
                  path: `errors.${rule.listPath}.rows.${index}`,
                  value:
                    patch && typeof patch === 'object' && !Array.isArray(patch) && Object.keys(patch).length === 0
                      ? undefined
                      : patch,
                },
              })
            }
          }
        }

        if (params.effectfulListRules && params.effectfulListRules.length > 0) {
          const stateForEffectfulRules = yield* runtime.getState
          for (const rule of params.effectfulListRules) {
            const input = getAtPath(stateForEffectfulRules, rule.listPath)
            const rows = Array.isArray(input) ? input : []
            const out = rule.validate(rows, {
              mode: 'submit',
              state: stateForEffectfulRules,
              scope: {
                fieldPath: rule.listPath,
                listPath: rule.listPath,
              },
            })
            if (!Effect.isEffect(out)) continue
            const result = yield* out
            const stateBeforeRuleWrite = yield* runtime.getState
            if (!isCurrentSubmitAttempt(stateBeforeRuleWrite, attemptSeq)) {
              return {
                ok: false,
                errors: (stateBeforeRuleWrite as any).errors,
              } satisfies SubmitVerdict<TDecoded>
            }
            const currentInput = getAtPath(stateBeforeRuleWrite, rule.listPath)
            if (!Object.is(currentInput, input)) continue
            yield* runtime.dispatch({
              _tag: 'setValue',
              payload: {
                path: `errors.${rule.listPath}.$list`,
                value: lowerRuleError(result),
              },
            })
          }
        }

        const stateAfterRules = yield* runtime.getState
        const {
          errors: _errorsAfterRules,
          ui: _uiAfterRules,
          $form: _metaAfterRules,
          ...valuesAfterRules
        } = stateAfterRules as any

        const decodedResult = (() => {
          try {
            const decoded = Schema.decodeUnknownSync(submitSchema as any)(valuesAfterRules as any)
            return { tree: {}, decoded }
          } catch (error) {
            return { tree: toSchemaErrorTree(error as SchemaError), decoded: undefined as TDecoded | undefined }
          }
        })()

        yield* runtime.dispatch({
          _tag: 'setValue',
          payload: { path: 'errors.$schema', value: decodedResult.tree },
        })

        const state = yield* runtime.getState
        if (!isCurrentSubmitAttempt(state, attemptSeq)) {
          return {
            ok: false,
            errors: (state as any).errors,
          } satisfies SubmitVerdict<TDecoded>
        }
        const errors = (state as any).errors
        const errorCount = readErrorCount(state)
        const observePaths = (() => {
          const out = new Set<string>()
          for (const [path, impact] of params.sourceSubmitImpactByPath ?? []) {
            if (impact === 'observe') out.add(path)
          }
          return out
        })()
        const pendingCount =
          observePaths.size > 0
            ? countPendingLeavesWithPolicy(valuesAfterRules, { observePaths })
            : countPendingLeaves(valuesAfterRules)
        const hasSchemaBlockingError =
          decodedResult.tree &&
          typeof decodedResult.tree === 'object' &&
          !Array.isArray(decodedResult.tree) &&
          Object.keys(decodedResult.tree as Record<string, unknown>).length > 0

        const blockingBasis =
          errorCount > 0 ? 'error' : hasSchemaBlockingError ? 'decode' : pendingCount > 0 ? 'pending' : 'none'
        const submitAttempt = makeSubmitAttemptSnapshot({
          seq: attemptSeq,
          verdict: blockingBasis === 'none' ? 'ok' : 'blocked',
          decodedVerdict: hasSchemaBlockingError ? 'invalid' : 'valid',
          blockingBasis,
          errorCount,
          pendingCount,
        })

        yield* runtime.dispatch({
          _tag: 'setSubmitAttempt',
          payload: submitAttempt,
        })

        if (blockingBasis !== 'none') {
          if (typeof options?.onInvalid === 'function') {
            const beforeInvalidHook = yield* runtime.getState
            if (!isCurrentSubmitAttempt(beforeInvalidHook, attemptSeq)) {
              return {
                ok: false,
                errors: (beforeInvalidHook as any).errors,
              } satisfies SubmitVerdict<TDecoded>
            }
            yield* runHook(options.onInvalid(errors))
          }
          return {
            ok: false,
            errors,
          } satisfies SubmitVerdict<TDecoded>
        }

        const decoded = (decodedResult.decoded ?? (valuesAfterRules as TDecoded)) as TDecoded
        if (typeof options?.onValid === 'function') {
          const beforeValidHook = yield* runtime.getState
          if (!isCurrentSubmitAttempt(beforeValidHook, attemptSeq)) {
            return {
              ok: false,
              errors: (beforeValidHook as any).errors,
            } satisfies SubmitVerdict<TDecoded>
          }
          yield* runHook(options.onValid(decoded, { values: valuesAfterRules as TValues }))
        }

        return {
          ok: true,
          decoded,
        } satisfies SubmitVerdict<TDecoded>
      }).pipe(Effect.ensuring(Effect.suspend(() => clearSubmittingIfCurrent(runtime, attemptSeq))))
    },
    reset: (values?: TValues) => runtime.dispatch({ _tag: 'reset', payload: values as any }),
    setError: (path: string, error: FormErrorLeaf) => runtime.dispatch({ _tag: 'setError', payload: { path, error } }),
    clearErrors: (paths?: ReadonlyArray<string> | string) =>
      runtime.dispatch({
        _tag: 'clearErrors',
        payload: paths === undefined ? undefined : typeof paths === 'string' ? [paths] : (paths as any),
      }),
    field: (path: string) => ({
      set: (value: unknown) => runtime.dispatch({ _tag: 'setValue', payload: { path, value } }),
      blur: () => runtime.dispatch({ _tag: 'blur', payload: { path } }),
    }),
    fieldArray: (path: string) => ({
      append: (value: unknown) => runtime.dispatch({ _tag: 'arrayAppend', payload: { path, value } }),
      prepend: (value: unknown) => runtime.dispatch({ _tag: 'arrayPrepend', payload: { path, value } }),
      insert: (index: number, value: unknown) => runtime.dispatch({ _tag: 'arrayInsert', payload: { path, index, value } }),
      update: (index: number, value: unknown) => runtime.dispatch({ _tag: 'arrayUpdate', payload: { path, index, value } }),
      replace: (nextItems: ReadonlyArray<unknown>) =>
        Effect.gen(function* () {
          const store = getRowIdStore(runtime)
          if (typeof store?.resetList === 'function') {
            store.resetList(path)
          }
          yield* runtime.dispatch({ _tag: 'arrayReplace', payload: { path, items: nextItems } })
        }),
      remove: (index: number) => runtime.dispatch({ _tag: 'arrayRemove', payload: { path, index } }),
      swap: (indexA: number, indexB: number) =>
        runtime.dispatch({ _tag: 'arraySwap', payload: { path, indexA, indexB } }),
      move: (from: number, to: number) => runtime.dispatch({ _tag: 'arrayMove', payload: { path, from, to } }),
      byRowId: (rowId: string) => ({
        update: (value: unknown) =>
          Effect.gen(function* () {
            const store = getRowIdStore(runtime)
            const state = yield* runtime.getState
            const items = getAtPath(state as any, path)
            const trackBy = getTrackByForListPath(runtime, path)
            if (Array.isArray(items) && typeof store?.ensureList === 'function') {
              store.ensureList(path, items, trackBy)
            }
            const index =
              store?.getIndex?.(path, rowId) ??
              (Array.isArray(items) && typeof trackBy === 'string'
                ? items.findIndex((item) => {
                    if (!item || typeof item !== 'object') return false
                    const segments = trackBy.split('.')
                    let current: any = item
                    for (const seg of segments) {
                      if (current == null) return false
                      current = current[seg]
                    }
                    return String(current) === rowId
                  })
                : undefined)
            if (typeof index !== 'number' || !Number.isFinite(index) || index < 0) return
            yield* runtime.dispatch({ _tag: 'arrayUpdate', payload: { path, index, value } })
          }),
        remove: () =>
          Effect.gen(function* () {
            const store = getRowIdStore(runtime)
            const state = yield* runtime.getState
            const items = getAtPath(state as any, path)
            const trackBy = getTrackByForListPath(runtime, path)
            if (Array.isArray(items) && typeof store?.ensureList === 'function') {
              store.ensureList(path, items, trackBy)
            }
            const index =
              store?.getIndex?.(path, rowId) ??
              (Array.isArray(items) && typeof trackBy === 'string'
                ? items.findIndex((item) => {
                    if (!item || typeof item !== 'object') return false
                    const segments = trackBy.split('.')
                    let current: any = item
                    for (const seg of segments) {
                      if (current == null) return false
                      current = current[seg]
                    }
                    return String(current) === rowId
                  })
                : undefined)
            if (typeof index !== 'number' || !Number.isFinite(index) || index < 0) return
            yield* runtime.dispatch({ _tag: 'arrayRemove', payload: { path, index } })
          }),
      }),
    }),
  }
}
