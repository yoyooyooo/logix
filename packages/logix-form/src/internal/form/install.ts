import * as Logix from '@logixjs/core'
import { Duration, Effect, Fiber } from 'effect'
import type { FormShape } from '../../Form.js'

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
 */
export const install = <TValues extends object>(
  module: Logix.ModuleTagType<any, FormShape<TValues>>,
  config?: FormInstallConfig,
): Logix.ModuleLogic<FormShape<TValues>, any, never> =>
  module.logic(($) => {
    const validateOn = config?.validateOn ?? ['onSubmit']
    const reValidateOn = config?.reValidateOn ?? ['onChange']
    const rulesValidateOn = config?.rulesValidateOn ?? []
    const debounceMs = config?.debounceMs
    const sourceWiring = Logix.TraitLifecycle.makeSourceWiring($, module)

    const validate = (trigger: Logix.TraitLifecycle.ValidateMode, path: string): Effect.Effect<void, never, any> =>
      Logix.TraitLifecycle.scopedValidate($, {
        mode: trigger,
        target: Logix.TraitLifecycle.Ref.fromValuePath(path),
      })

    const validateRoot = (): Effect.Effect<void, never, any> =>
      Logix.TraitLifecycle.scopedValidate($, {
        mode: 'submit',
        target: Logix.TraitLifecycle.Ref.root(),
      })

    const pending = new Map<string, Fiber.RuntimeFiber<void, never>>()

    const cancelPending = (path: string): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const prev = pending.get(path)
        if (!prev) return
        pending.delete(path)
        yield* Fiber.interruptFork(prev)
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
            Effect.zipRight(validate('valueChange', path)),
            Effect.ensuring(Effect.sync(() => pending.delete(path))),
            Effect.catchAllCause(() => Effect.void),
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

    const setup = sourceWiring.setup

    const run = Effect.gen(function* () {
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
        Effect.gen(function* () {
          yield* sourceWiring.refreshOnKeyChange(action.payload.path)
          if (!wantsChange) return
          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return
          yield* Logix.TraitLifecycle.scopedValidate($, {
            mode: 'valueChange',
            target: Logix.TraitLifecycle.Ref.list(action.payload.path),
          })
        }),
      )
      yield* $.onAction('arrayPrepend').runFork((action) =>
        Effect.gen(function* () {
          yield* sourceWiring.refreshOnKeyChange(action.payload.path)
          if (!wantsChange) return
          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return
          yield* Logix.TraitLifecycle.scopedValidate($, {
            mode: 'valueChange',
            target: Logix.TraitLifecycle.Ref.list(action.payload.path),
          })
        }),
      )
      yield* $.onAction('arrayRemove').runFork((action) =>
        Effect.gen(function* () {
          yield* sourceWiring.refreshOnKeyChange(action.payload.path)
          if (!wantsChange) return
          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return
          yield* Logix.TraitLifecycle.scopedValidate($, {
            mode: 'valueChange',
            target: Logix.TraitLifecycle.Ref.list(action.payload.path),
          })
        }),
      )
      yield* $.onAction('arraySwap').runFork((action) =>
        Effect.gen(function* () {
          yield* sourceWiring.refreshOnKeyChange(action.payload.path)
          if (!wantsChange) return
          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return
          yield* Logix.TraitLifecycle.scopedValidate($, {
            mode: 'valueChange',
            target: Logix.TraitLifecycle.Ref.list(action.payload.path),
          })
        }),
      )
      yield* $.onAction('arrayMove').runFork((action) =>
        Effect.gen(function* () {
          yield* sourceWiring.refreshOnKeyChange(action.payload.path)
          if (!wantsChange) return
          const state = yield* $.state.read
          const submitCount = readSubmitCount(state)
          if (!shouldValidateNow(submitCount, 'onChange')) return
          yield* Logix.TraitLifecycle.scopedValidate($, {
            mode: 'valueChange',
            target: Logix.TraitLifecycle.Ref.list(action.payload.path),
          })
        }),
      )
    }).pipe(Effect.asVoid)

    return { setup, run }
  }) as Logix.ModuleLogic<FormShape<TValues>, any, never>
