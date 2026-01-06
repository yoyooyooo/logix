import { Context, Effect, FiberRef, Option } from 'effect'
import { create } from 'mutative'
import type { BoundApi } from '../runtime/core/module.js'
import { getBoundInternals } from '../runtime/core/runtimeInternalsAccessor.js'
import * as TaskRunner from '../runtime/core/TaskRunner.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { getExternalStoreDescriptor } from '../external-store-descriptor.js'
import { normalizeFieldPath } from '../field-path.js'
import { DeclarativeLinkRuntimeTag } from '../runtime/core/env.js'
import * as RowId from './rowid.js'
import type { StateTraitEntry, StateTraitPlanStep } from './model.js'

const isFn = (value: unknown): value is (...args: ReadonlyArray<any>) => unknown => typeof value === 'function'

const microtask = Effect.promise(() => new Promise<void>((r) => queueMicrotask(r)))

type ExternalStoreEntry<S> = Extract<StateTraitEntry<S, string>, { readonly kind: 'externalStore' }>

const resolveStore = (entry: ExternalStoreEntry<any>): Effect.Effect<any, never, any> =>
  Effect.gen(function* () {
    const store = (entry.meta as any)?.store
    const descriptor = getExternalStoreDescriptor(store)

    if (descriptor?.kind === 'service') {
      const service = yield* descriptor.tag
      return descriptor.map(service)
    }

    return store
  })

export const installExternalStoreSync = <S>(
  bound: BoundApi<any, any>,
  step: StateTraitPlanStep,
  entry: ExternalStoreEntry<S>,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const fieldPath = step.targetFieldPath
    if (!fieldPath) return

    const env = yield* Effect.context<any>()

    let internals: ReturnType<typeof getBoundInternals>
    try {
      internals = getBoundInternals(bound as any)
    } catch {
      return
    }

    const select = (entry.meta as any)?.select as ((snapshot: unknown) => unknown) | undefined
    const equals = (entry.meta as any)?.equals as ((a: unknown, b: unknown) => boolean) | undefined

    const computeValue = (snapshot: unknown): unknown => (isFn(select) ? select(snapshot) : snapshot)
    const isEqual = (a: unknown, b: unknown): boolean => (isFn(equals) ? equals(a, b) : Object.is(a, b))

    const rawStore = (entry.meta as any)?.store
    const rawDescriptor = getExternalStoreDescriptor(rawStore)

    if (rawDescriptor?.kind === 'module') {
      const linkRuntimeOpt = yield* Effect.serviceOption(DeclarativeLinkRuntimeTag)
      if (Option.isNone(linkRuntimeOpt)) {
        return yield* Effect.dieMessage('[StateTrait.externalStore] Missing DeclarativeLinkRuntime service (073).')
      }

      const module = rawDescriptor.module

      const sourceRuntime = (() => {
        if (module && typeof module === 'object') {
          const moduleId = (module as any).moduleId
          const instanceId = (module as any).instanceId
          const getState = (module as any).getState
          if (typeof moduleId === 'string' && moduleId.length > 0 && typeof instanceId === 'string' && instanceId.length > 0 && getState) {
            return module as any
          }

          const tag = (module as any).tag
          if (tag && Context.isTag(tag)) {
            return internals.imports.get(tag as any)
          }

          if (Context.isTag(module as any)) {
            return internals.imports.get(module as any)
          }
        }
        return undefined
      })()

      if (!sourceRuntime) {
        return yield* Effect.dieMessage(
          `[StateTrait.externalStore] Module-as-Source store is unresolved for "${fieldPath}". ` +
            `Fix: include the source ModuleTag in module imports (moduleId=${rawDescriptor.moduleId}).`,
        )
      }

      if (rawDescriptor.instanceId && rawDescriptor.instanceId !== sourceRuntime.instanceId) {
        return yield* Effect.dieMessage(
          `[StateTrait.externalStore] Module-as-Source instanceId mismatch for "${fieldPath}". ` +
            `descriptor.instanceId=${rawDescriptor.instanceId}, resolved.instanceId=${sourceRuntime.instanceId}`,
        )
      }

      if (sourceRuntime.moduleId !== rawDescriptor.moduleId) {
        return yield* Effect.dieMessage(
          `[StateTrait.externalStore] Module-as-Source moduleId mismatch for "${fieldPath}". ` +
            `descriptor.moduleId=${rawDescriptor.moduleId}, resolved.moduleId=${sourceRuntime.moduleId}`,
        )
      }

      const staticIr = rawDescriptor.readQuery.staticIr
      const isRecognizableStatic =
        staticIr.lane === 'static' && staticIr.readsDigest != null && staticIr.fallbackReason == null

      if (!isRecognizableStatic) {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId: internals.moduleId,
          instanceId: internals.instanceId,
          code: 'external_store::module_source_degraded',
          severity: 'warning',
          message:
            '[StateTrait.externalStore] Module-as-Source selector is not fully IR-recognizable; falling back to module-topic edge (may reduce perf).',
          hint:
            'Fix: provide a static ReadQuery (ReadQuery.make) or annotate selector.fieldPaths to get a stable readsDigest; avoid dynamic lane.',
          kind: 'module_as_source_degraded',
          trigger: {
            kind: 'trait',
            name: 'externalStore.moduleSource',
            details: {
              sourceModuleId: rawDescriptor.moduleId,
              selectorId: staticIr.selectorId,
              lane: staticIr.lane,
              fallbackReason: staticIr.fallbackReason,
              readsDigest: staticIr.readsDigest,
            },
          },
        })
      }

      const moduleInstanceKey = `${sourceRuntime.moduleId}::${sourceRuntime.instanceId}` as any

      const writeValue = (nextValue: unknown): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)

          const body = Effect.gen(function* () {
            const prevState = (yield* bound.state.read) as any
            const prevValue = RowId.getAtPath(prevState as any, fieldPath)

            if (isEqual(prevValue, nextValue)) {
              return
            }

            const nextDraft = create(prevState, (draft) => {
              RowId.setAtPathMutating(draft as any, fieldPath, nextValue)
            })

            const normalized = normalizeFieldPath(fieldPath) ?? []
            internals.txn.recordStatePatch(normalized, 'trait-external-store', prevValue, nextValue, step.id)
            internals.txn.updateDraft(nextDraft)
          })

          if (inTxn) {
            return yield* body
          }

          return yield* internals.txn.runWithStateTransaction({ kind: 'trait-external-store', name: fieldPath } as any, () =>
            body.pipe(Effect.asVoid),
          )
        }).pipe(Effect.provide(env))

      const unregister = linkRuntimeOpt.value.registerModuleAsSourceLink({
        id: `${internals.instanceId}::externalStore:${step.id}`,
        sourceModuleInstanceKey: moduleInstanceKey,
        readQuery: rawDescriptor.readQuery as any,
        computeValue,
        equalsValue: isEqual,
        applyValue: writeValue,
      })

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          unregister()
        }),
      )

      // Initial sync: read the current source snapshot and write it back immediately.
      const initialState = yield* (sourceRuntime.getState as Effect.Effect<unknown, never, never>)
      const initialSelected = rawDescriptor.readQuery.select(initialState as any)
      yield* writeValue(computeValue(initialSelected))

      return
    }

    const store = rawDescriptor?.kind === 'service' ? yield* resolveStore(entry) : rawStore

    if (!store || typeof store !== 'object') {
      return yield* Effect.dieMessage(
        `[StateTrait.externalStore] Invalid store for "${fieldPath}". Expected { getSnapshot, subscribe }.`,
      )
    }
    if (!isFn((store as any).getSnapshot) || !isFn((store as any).subscribe)) {
      return yield* Effect.dieMessage(
        `[StateTrait.externalStore] Invalid store for "${fieldPath}". Expected { getSnapshot, subscribe }.`,
      )
    }

    let fused = false
    let pending = false
    let resume: (() => void) | undefined
    let waitPromise: Promise<void> | undefined

    const signal = (): void => {
      if (fused) return
      pending = true
      if (resume) {
        const r = resume
        resume = undefined
        waitPromise = undefined
        r()
      }
    }

    const awaitSignal = Effect.promise(() => {
      if (pending) {
        pending = false
        return Promise.resolve()
      }
      if (!waitPromise) {
        waitPromise = new Promise<void>((r) => {
          resume = r
        })
      }
      return waitPromise
    })

    const getSnapshotOrFuse = (): unknown => {
      try {
        return (store as any).getSnapshot()
      } catch {
        fused = true
        return undefined
      }
    }

    // T016: atomic init semantics (no missed updates between getSnapshot() and subscribe()).
    const before = getSnapshotOrFuse()
    if (fused) return

    const unsubscribe = (store as any).subscribe(signal) as (() => void) | undefined
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        try {
          unsubscribe?.()
        } catch {
          // best-effort
        }
      }),
    )

    const after = getSnapshotOrFuse()
    if (fused) return

    const writeValue = (nextValue: unknown): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)

        const body = Effect.gen(function* () {
          const prevState = (yield* bound.state.read) as any
          const prevValue = RowId.getAtPath(prevState as any, fieldPath)

          if (isEqual(prevValue, nextValue)) {
            return
          }

          const nextDraft = create(prevState, (draft) => {
            RowId.setAtPathMutating(draft as any, fieldPath, nextValue)
          })

          const normalized = normalizeFieldPath(fieldPath) ?? []
          internals.txn.recordStatePatch(normalized, 'trait-external-store', prevValue, nextValue, step.id)
          internals.txn.updateDraft(nextDraft)
        })

        if (inTxn) {
          return yield* body
        }

        return yield* internals.txn.runWithStateTransaction({ kind: 'trait-external-store', name: fieldPath } as any, () =>
          body.pipe(Effect.asVoid),
        )
      })

    // Use the post-subscribe snapshot as the initial committed value to avoid missing an update between getSnapshot and subscribe.
    yield* writeValue(computeValue(after))

    if (!isEqual(before, after)) {
      signal()
    }

    // Long-lived sync loop: coalesce changes, pull latest snapshot, and write back in a txn.
    yield* Effect.forkScoped(
      Effect.gen(function* () {
        while (true) {
          yield* awaitSignal
          if (fused) return
          yield* microtask
          if (fused) return

          const snapshot = getSnapshotOrFuse()
          if (fused) return

          yield* writeValue(computeValue(snapshot))
        }
      }),
    )
  })
