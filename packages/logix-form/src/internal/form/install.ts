import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Duration, Effect, Fiber } from 'effect'
import type { FormShape } from './impl.js'

export type FormValidateOn = 'onSubmit' | 'onChange' | 'onBlur'

export interface FormInstallConfig {
  readonly validateOn: ReadonlyArray<FormValidateOn>
  readonly reValidateOn: ReadonlyArray<FormValidateOn>
  /**
   * rulesValidateOn：
   * - The set of explicitly declared validateOn triggers from `rules` (no inherited rules).
   * - Used to decide event wiring and whether to trigger scoped validation during the pre-submit phase.
   */
  readonly rulesValidateOn?: ReadonlyArray<Exclude<FormValidateOn, 'onSubmit'>>
  readonly debounceMs?: number
}

const isAuxRootPath = (path: string): boolean =>
  path === 'errors' ||
  path === 'ui' ||
  path === '$form' ||
  path.startsWith('errors.') ||
  path.startsWith('ui.') ||
  path.startsWith('$form.')

type InstallActionMap = {
  readonly setValue: Logix.AnySchema
  readonly blur: Logix.AnySchema
} & Record<string, Logix.AnySchema>

/**
 * Form.install：
 * - Default domain wiring: maps UI events (setValue/blur) to scopedValidate (ReverseClosure is guaranteed by the kernel).
 * - UI subtree writes (dirty/touched) are synchronously committed by the reducer to avoid tearing.
 * - By default, avoids scattering useEffect triggers on the React side.
 * - semantic-owner boundary: this bridge only schedules admitted runtime work.
 * - field(path).source(...) exact act stays in Form and never moves into install-time helpers.
 */
export const install = <TValues extends object>(
  module: Logix.Module.ModuleTag<any, FormShape<TValues>>,
  config?: FormInstallConfig,
): Logix.ModuleLogic<FormShape<TValues>, any, never> =>
  module.logic('module-logic', ($) => {
    const validateOn = config?.validateOn ?? ['onSubmit']
    const reValidateOn = config?.reValidateOn ?? ['onChange']
    const rulesValidateOn = config?.rulesValidateOn ?? []
    const debounceMs = config?.debounceMs
    const sourceWiring = FieldContracts.makeFieldSourceWiring($, module)
    const fieldProgram = FieldContracts.getModuleFieldsProgram(module as any) as
      | {
          readonly entries?: ReadonlyArray<{
            readonly kind?: string
            readonly fieldPath?: string
          }>
        }
      | undefined
    const hasCompanionWriters =
      fieldProgram?.entries?.some((entry) => entry?.kind === 'computed' && (entry as any)?.meta?._formCompanion === true) ??
      false

    const validate = (trigger: FieldContracts.FieldValidateMode, path: string): Effect.Effect<void, never, any> =>
      FieldContracts.fieldScopedValidate($, {
        mode: trigger,
        target: FieldContracts.fieldRef.fromValuePath(path),
      })

    const validateRoot = (): Effect.Effect<void, never, any> =>
      FieldContracts.fieldScopedValidate($, {
        mode: 'submit',
        target: FieldContracts.fieldRef.root(),
      })

    const pending = new Map<string, Fiber.Fiber<void, never>>()

    const cancelPending = (path: string): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const prev = pending.get(path)
        if (!prev) return
        pending.delete(path)
        yield* Fiber.interrupt(prev)
      })

    const scheduleDebouncedValidate = (path: string): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const ms = debounceMs ?? 0
        if (ms <= 0) {
          yield* validate('valueChange', path)
          return
        }

        yield* cancelPending(path)
        const fiber = yield* Effect.forkScoped(
          Effect.sleep(Duration.millis(ms)).pipe(
            Effect.flatMap(() => validate('valueChange', path)),
            Effect.ensuring(Effect.sync(() => pending.delete(path))),
            Effect.catchCause(() => Effect.void),
          ),
        )
        pending.set(path, fiber)
      })

    const has = (list: ReadonlyArray<FormValidateOn>, item: FormValidateOn): boolean => list.includes(item)

    const wantsChange =
      has(validateOn, 'onChange') || has(reValidateOn, 'onChange') || rulesValidateOn.includes('onChange')

    const wantsBlur = has(validateOn, 'onBlur') || has(reValidateOn, 'onBlur') || rulesValidateOn.includes('onBlur')

    const shouldValidateNow = (submitCount: number, trigger: Exclude<FormValidateOn, 'onSubmit'>): boolean => {
      const effective = submitCount > 0 ? reValidateOn : validateOn
      if (effective.includes(trigger)) return true
      return rulesValidateOn.includes(trigger)
    }

    const readSubmitCount = (state: unknown): number => {
      const form = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
      const v = form && typeof form === 'object' && !Array.isArray(form) ? (form as any).submitCount : undefined
      return typeof v === 'number' && Number.isFinite(v) ? v : 0
    }

    const refreshArraySourcesAndMaybeValidate = (path: string): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        yield* sourceWiring.refreshOnKeyChange(path)
        if (!wantsChange) return
        const state = yield* $.state.read
        const submitCount = readSubmitCount(state)
        if (!shouldValidateNow(submitCount, 'onChange')) return
        yield* FieldContracts.fieldScopedValidate($, {
          mode: 'valueChange',
          target: FieldContracts.fieldRef.list(path),
        })
      })

    sourceWiring.registerOnMount()

    if (hasCompanionWriters) {
      FieldContracts.registerBoundStart(
        $ as any,
        FieldContracts.runWithBoundStateTransaction(
          $ as any,
          {
            kind: 'field',
            name: 'startupConverge',
            details: { target: 'companion' },
          },
          () => Effect.void,
        ),
        { name: 'form:startupConverge' },
      )
    }

    return Effect.gen(function* () {

      // blur: trigger scoped validation if required by the current phase or rule allowlist.
      if (wantsBlur) {
        yield* $.onAction('blur').runFork((action) =>
          Effect.gen(function* () {
            const path = action.payload.path
            if (!path || isAuxRootPath(path)) return

            yield* cancelPending(path)

            const state = yield* $.state.read
            const submitCount = readSubmitCount(state)
            if (!shouldValidateNow(submitCount, 'onBlur')) return

            yield* validate('blur', path)
          }),
        )
      }

      // setValue: source wiring is always needed; triggering validation depends on validateOn/reValidateOn + rules.validateOn.
      yield* $.onAction('setValue').runFork((action) =>
        Effect.gen(function* () {
          const path = action.payload.path
          if (!path || isAuxRootPath(path)) return

          yield* sourceWiring.refreshOnKeyChange(path)
          yield* cancelPending(path)

          if (!wantsChange) return

          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return

          yield* scheduleDebouncedValidate(path)
        }),
      )

      // submit: always triggers root validation (even if validateOn only includes onBlur, we still validate on submit).
      yield* $.onAction('submit').runFork(() =>
        Effect.gen(function* () {
          pending.clear()
          yield* validateRoot()
        }),
      )

      // Array structural changes: refresh if they affect source deps.
      yield* $.onAction('arrayAppend').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayPrepend').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayInsert').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayUpdate').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayReplace').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayRemove').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arraySwap').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
      yield* $.onAction('arrayMove').runFork((action) =>
        refreshArraySourcesAndMaybeValidate(action.payload.path),
      )
    }).pipe(Effect.asVoid)
  }) as Logix.ModuleLogic<FormShape<TValues>, any, never>
