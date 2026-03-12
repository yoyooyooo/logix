import { Effect, Fiber, Option, ServiceMap, Stream } from 'effect'
import { create } from 'mutative'
import type { BoundApi } from '../runtime/core/module.js'
import { getBoundInternals } from '../runtime/core/runtimeInternalsAccessor.js'
import * as TaskRunner from '../runtime/core/TaskRunner.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { getExternalStoreDescriptor } from '../external-store-descriptor.js'
import { normalizeFieldPath } from '../field-path.js'
import { DeclarativeLinkRuntimeTag } from '../runtime/core/env.js'
import type { DeclarativeLinkRuntimeService } from '../runtime/core/env.js'
import * as RowId from './rowid.js'
import type { StateTraitEntry, StateTraitPlanStep } from './model.js'

const isFn = (value: unknown): value is (...args: ReadonlyArray<any>) => unknown => typeof value === 'function'

type ExternalStoreEntry<S> = Extract<StateTraitEntry<S, string>, { readonly kind: 'externalStore' }>

type ExternalStoreLike = {
  readonly getSnapshot: () => unknown
  readonly subscribe: (listener: () => void) => (() => void) | undefined
}

type ExternalStoreWritebackCommitPriority = 'normal' | 'low'

type ExternalStoreWritebackRequest = {
  readonly fieldPath: string
  readonly traitNodeId: string
  readonly normalizedPatchPath: ReadonlyArray<string>
  readonly nextValue: unknown
  readonly isEqual: (a: unknown, b: unknown) => boolean
  readonly commitPriority: ExternalStoreWritebackCommitPriority
}

type ExternalStoreWritebackCoordinator = {
  readonly enqueue: (request: ExternalStoreWritebackRequest) => Effect.Effect<void, never, any>
}

const writebackCoordinatorByInternals = new WeakMap<object, ExternalStoreWritebackCoordinator>()

const getOrCreateExternalStoreWritebackCoordinator = (args: {
  readonly internals: ReturnType<typeof getBoundInternals>
  readonly bound: BoundApi<any, any>
  readonly env: ServiceMap.ServiceMap<any>
}): Effect.Effect<ExternalStoreWritebackCoordinator, never, any> =>
  Effect.gen(function* () {
    const cached = writebackCoordinatorByInternals.get(args.internals as any)
    if (cached) return cached

    let closed = false
    let inFlight = false
    let pendingWrites = new Map<string, ExternalStoreWritebackRequest>()

    const drainPendingWrites = (): ReadonlyArray<ExternalStoreWritebackRequest> => {
      if (pendingWrites.size === 0) return []
      const drained = pendingWrites
      pendingWrites = new Map()
      return Array.from(drained.values())
    }

    const makeSingleFieldNextState = (
      prevState: unknown,
      normalizedPatchPath: ReadonlyArray<string>,
      fieldPath: string,
      nextValue: unknown,
    ): unknown => {
      if (
        normalizedPatchPath.length === 1 &&
        prevState !== null &&
        typeof prevState === 'object' &&
        !Array.isArray(prevState)
      ) {
        const fieldKey = normalizedPatchPath[0]!
        return {
          ...(prevState as Record<string, unknown>),
          [fieldKey]: nextValue,
        }
      }

      return create(prevState, (draft) => {
        RowId.setAtPathMutating(draft as any, fieldPath, nextValue)
      })
    }

    const applyWritebackBatch = (batch: ReadonlyArray<ExternalStoreWritebackRequest>): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        if (batch.length === 0) return

        // Hot-path: single field writeback (most externalStore updates).
        // Avoid allocating per-batch/per-change arrays here: full diagnostics already has higher overhead.
        if (batch.length === 1) {
          const req = batch[0]!
          const prevState = (yield* args.bound.state.read) as any
          const prevValue = RowId.getAtPath(prevState as any, req.fieldPath)
          if (req.isEqual(prevValue, req.nextValue)) return

          const nextDraft = makeSingleFieldNextState(
            prevState,
            req.normalizedPatchPath,
            req.fieldPath,
            req.nextValue,
          )

          args.internals.txn.recordStatePatch(
            req.normalizedPatchPath,
            'trait-external-store',
            prevValue,
            req.nextValue,
            req.traitNodeId,
          )
          args.internals.txn.updateDraft(nextDraft)
          return
        }

        const prevState = (yield* args.bound.state.read) as any

        const changes: Array<{
          readonly request: ExternalStoreWritebackRequest
          readonly prevValue: unknown
        }> = []

        for (let i = 0; i < batch.length; i++) {
          const req = batch[i]!
          const prevValue = RowId.getAtPath(prevState as any, req.fieldPath)
          if (req.isEqual(prevValue, req.nextValue)) continue
          changes.push({ request: req, prevValue })
        }

        if (changes.length === 0) return

        const nextDraft = create(prevState, (draft) => {
          for (let i = 0; i < changes.length; i++) {
            const { request } = changes[i]!
            RowId.setAtPathMutating(draft as any, request.fieldPath, request.nextValue)
          }
        })

        for (let i = 0; i < changes.length; i++) {
          const { request, prevValue } = changes[i]!
          args.internals.txn.recordStatePatch(
            request.normalizedPatchPath,
            'trait-external-store',
            prevValue,
            request.nextValue,
            request.traitNodeId,
          )
        }

        args.internals.txn.updateDraft(nextDraft)
      })

    const coordinator: ExternalStoreWritebackCoordinator = {
      enqueue: (request) =>
        Effect.gen(function* () {
          if (closed) return

          pendingWrites.set(request.fieldPath, request)

          // Single-flusher: avoid an extra per-module fiber by letting the first caller drain the queue.
          if (inFlight) return
          inFlight = true

          try {
            while (true) {
              const batch = drainPendingWrites()
              if (batch.length === 0) return

              const commitPriority: ExternalStoreWritebackCommitPriority = batch.some((x) => x.commitPriority === 'normal')
                ? 'normal'
                : 'low'

              const originName = batch.length === 1 ? batch[0]!.fieldPath : 'externalStore:batched'

              yield* args.internals.txn
                .runWithStateTransaction(
                  {
                    kind: 'trait-external-store',
                    name: originName,
                    details: {
                      stateCommit: {
                        priority: commitPriority,
                      },
                    },
                  },
                  () => applyWritebackBatch(batch).pipe(Effect.asVoid),
                )
                .pipe(Effect.provide(args.env))
            }
          } finally {
            inFlight = false
          }
        }),
    }

    writebackCoordinatorByInternals.set(args.internals as any, coordinator)

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        closed = true
        pendingWrites.clear()
      }),
    )

    return coordinator
  })

const resolveStore = (entry: ExternalStoreEntry<any>): Effect.Effect<any, never, any> =>
  Effect.gen(function* () {
    const store = (entry.meta as any)?.store
    const descriptor = getExternalStoreDescriptor(store)

    if (descriptor?.kind === 'service') {
      const service = yield* Effect.service(descriptor.tag as ServiceMap.Key<any, unknown>).pipe(Effect.orDie)
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

    const env = yield* Effect.services<any>()
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

    const traitLane = (entry.meta as any)?.priority as 'urgent' | 'nonUrgent' | undefined

    const rawStore = (entry.meta as any)?.store
    const rawDescriptor = getExternalStoreDescriptor(rawStore)

    const makeScopedDescriptorStore = (): Effect.Effect<ExternalStoreLike | undefined, never, any> =>
      Effect.gen(function* () {
        if (rawDescriptor?.kind === 'subscriptionRef') {
          let current = yield* Effect.provideService(rawDescriptor.ref.get as any, TaskRunner.inSyncTransactionFiber, false)
          const listeners = new Set<() => void>()

          const notify = (): void => {
            for (const listener of listeners) {
              listener()
            }
          }

          const fiber = yield* Effect.forkDetach(
            Effect.provideService(Stream.runForEach(rawDescriptor.ref.changes as Stream.Stream<unknown, never, never>, (value) =>
              Effect.sync(() => {
                current = value
                notify()
              }),
            ).pipe(Effect.catchCause(() => Effect.void)), TaskRunner.inSyncTransactionFiber, false),
            { startImmediately: true },
          )
          internals.lifecycle.registerDestroy(Fiber.interrupt(fiber).pipe(Effect.asVoid), { name: `externalStore:${fieldPath}:subscriptionRef` })

          return {
            getSnapshot: () => current,
            subscribe: (listener) => {
              listeners.add(listener)
              return () => {
                listeners.delete(listener)
              }
            },
          }
        }

        if (rawDescriptor?.kind === 'stream') {
          let current = rawDescriptor.initial
          const listeners = new Set<() => void>()

          const notify = (): void => {
            for (const listener of listeners) {
              listener()
            }
          }

          const fiber = yield* Effect.forkDetach(
            Effect.provideService(Stream.runForEach(rawDescriptor.stream as Stream.Stream<unknown, any, any>, (value) =>
              Effect.sync(() => {
                current = value
                notify()
              }),
            ).pipe(Effect.catchCause(() => Effect.void)), TaskRunner.inSyncTransactionFiber, false),
            { startImmediately: true },
          )
          internals.lifecycle.registerDestroy(Fiber.interrupt(fiber).pipe(Effect.asVoid), { name: `externalStore:${fieldPath}:stream` })

          return {
            getSnapshot: () => current,
            subscribe: (listener) => {
              listeners.add(listener)
              return () => {
                listeners.delete(listener)
              }
            },
          }
        }

        return undefined
      }) as Effect.Effect<ExternalStoreLike | undefined, never, any>

    if (rawDescriptor?.kind === 'module') {
      const linkRuntimeOpt = yield* Effect.serviceOption(
        DeclarativeLinkRuntimeTag as unknown as ServiceMap.Key<any, DeclarativeLinkRuntimeService>,
      )
      if (Option.isNone(linkRuntimeOpt)) {
        return yield* Effect.die(new Error('[StateTrait.externalStore] Missing DeclarativeLinkRuntime service (073).'))
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
          if (tag && ServiceMap.isKey(tag)) {
            return internals.imports.get(tag as any)
          }

          if (ServiceMap.isKey(module as any)) {
            return internals.imports.get(module as any)
          }
        }
        return undefined
      })()

      if (!sourceRuntime) {
        return yield* Effect.die(new Error(`[StateTrait.externalStore] Module-as-Source store is unresolved for "${fieldPath}". ` +
          `Fix: include the source ModuleTag in module imports (moduleId=${rawDescriptor.moduleId}).`))
      }

      if (rawDescriptor.instanceId && rawDescriptor.instanceId !== sourceRuntime.instanceId) {
        return yield* Effect.die(new Error(`[StateTrait.externalStore] Module-as-Source instanceId mismatch for "${fieldPath}". ` +
          `descriptor.instanceId=${rawDescriptor.instanceId}, resolved.instanceId=${sourceRuntime.instanceId}`))
      }

      if (sourceRuntime.moduleId !== rawDescriptor.moduleId) {
        return yield* Effect.die(new Error(`[StateTrait.externalStore] Module-as-Source moduleId mismatch for "${fieldPath}". ` +
          `descriptor.moduleId=${rawDescriptor.moduleId}, resolved.moduleId=${sourceRuntime.moduleId}`))
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
          const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)

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

          const stateCommitPriority = traitLane === 'nonUrgent' ? 'low' : 'normal'
          return yield* internals.txn.runWithStateTransaction(
            {
              kind: 'trait-external-store',
              name: fieldPath,
              details: {
                stateCommit: {
                  priority: stateCommitPriority,
                },
              },
            },
            () => body.pipe(Effect.asVoid),
          )
        }).pipe(Effect.provideServices(env))

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

    const scopedDescriptorStore = yield* makeScopedDescriptorStore()
    const store = scopedDescriptorStore ?? (rawDescriptor?.kind === 'service' ? yield* resolveStore(entry) : rawStore)

    if (!store || typeof store !== 'object') {
      return yield* Effect.die(new Error(`[StateTrait.externalStore] Invalid store for "${fieldPath}". Expected { getSnapshot, subscribe }.`))
    }
    if (!isFn((store as any).getSnapshot) || !isFn((store as any).subscribe)) {
      return yield* Effect.die(new Error(`[StateTrait.externalStore] Invalid store for "${fieldPath}". Expected { getSnapshot, subscribe }.`))
    }

    let fused = false
    let fuseCause: unknown | undefined
    let fuseRecorded = false
    let pending = false
    let resume: (() => void) | undefined

    const recordFuseDiagnostic = Effect.gen(function* () {
      if (fuseRecorded) return
      fuseRecorded = true

      const errorMessage = (() => {
        if (fuseCause instanceof Error) return fuseCause.message
        if (typeof fuseCause === 'string') return fuseCause
        return 'unknown'
      })()

      yield* Debug.record({
        type: 'diagnostic',
        moduleId: internals.moduleId,
        instanceId: internals.instanceId,
        code: 'external_store::snapshot_threw',
        severity: 'warning',
        message:
          `[StateTrait.externalStore] store.getSnapshot() threw; trait is fused and will stop syncing for "${fieldPath}".`,
        hint: 'Fix: ensure getSnapshot is synchronous and non-throwing; async resources should use StateTrait.source or ExternalStore.fromStream({ current/initial }).',
        kind: 'external_store_fused:get_snapshot',
        trigger: {
          kind: 'trait',
          name: 'externalStore.getSnapshot',
          details: {
            fieldPath,
            traitId: step.id,
            storeKind: rawDescriptor?.kind ?? 'raw',
            error: errorMessage,
          },
        },
      })
    })

    const signal = (): void => {
      if (fused) return
      if (resume) {
        const r = resume
        pending = false
        r()
        return
      }
      pending = true
    }

    const awaitSignal = (): Effect.Effect<void, never, never> => {
      if (pending) {
        pending = false
        return Effect.void
      }

      return Effect.promise<void>((signal) =>
        new Promise<void>((resolve) => {
          let done = false
          const r = () => {
            if (done) return
            done = true
            resume = undefined
            resolve()
          }

          resume = r

          signal.addEventListener(
            'abort',
            () => {
              if (resume === r) {
                resume = undefined
              }
            },
            { once: true },
          )
        }),
      )
    }

    const getSnapshotOrFuse = (): unknown => {
      try {
        return (store as any).getSnapshot()
      } catch (err) {
        fused = true
        fuseCause = err
        return undefined
      }
    }

    const readSnapshotOrFuse = Effect.provideService(Effect.sync(getSnapshotOrFuse), TaskRunner.inSyncTransactionFiber, false)

    // T016: atomic init semantics (no missed updates between getSnapshot() and subscribe()).
    const before = yield* readSnapshotOrFuse
    if (fused) {
      yield* recordFuseDiagnostic
      return
    }

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

    const after = yield* readSnapshotOrFuse
    if (fused) {
      yield* recordFuseDiagnostic
      return
    }

    const coordinator = yield* getOrCreateExternalStoreWritebackCoordinator({ internals, bound, env })

    const normalizedPatchPath = normalizeFieldPath(fieldPath) ?? []
    const commitPriority: ExternalStoreWritebackCommitPriority = traitLane === 'nonUrgent' ? 'low' : 'normal'

    const writeValueSync = (nextValue: unknown): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)

        const body = Effect.gen(function* () {
          const prevState = (yield* bound.state.read) as any
          const prevValue = RowId.getAtPath(prevState as any, fieldPath)

          if (isEqual(prevValue, nextValue)) {
            return
          }

          const nextDraft = create(prevState, (draft) => {
            RowId.setAtPathMutating(draft as any, fieldPath, nextValue)
          })

          internals.txn.recordStatePatch(normalizedPatchPath, 'trait-external-store', prevValue, nextValue, step.id)
          internals.txn.updateDraft(nextDraft)
        })

        if (inTxn) {
          return yield* body
        }

        return yield* internals.txn.runWithStateTransaction(
          {
            kind: 'trait-external-store',
            name: fieldPath,
            details: {
              stateCommit: {
                priority: commitPriority,
              },
            },
          },
          () => body.pipe(Effect.asVoid),
        )
      }).pipe(Effect.provideServices(env))

    const enqueueWriteValue = (nextValue: unknown): Effect.Effect<void, never, any> =>
      coordinator.enqueue({
        fieldPath,
        traitNodeId: step.id,
        normalizedPatchPath,
        nextValue,
        isEqual,
        commitPriority,
      })

    // Use the post-subscribe snapshot as the initial committed value to avoid missing an update between getSnapshot and subscribe.
    yield* writeValueSync(computeValue(after))

    if (!isEqual(before, after)) {
      signal()
    }

    // Long-lived sync loop: coalesce changes, pull latest snapshot, and write back in a txn.
    const fiber = yield* Effect.forkDetach(
      Effect.provideService(Effect.gen(function* () {
        while (true) {
          yield* awaitSignal()
          if (fused) return
      
          const snapshot = yield* readSnapshotOrFuse
          if (fused) {
            yield* recordFuseDiagnostic
            return
          }
      
          yield* enqueueWriteValue(computeValue(snapshot))
        }
      }), TaskRunner.inSyncTransactionFiber, false),
      { startImmediately: true },
    )
    internals.lifecycle.registerDestroy(Fiber.interrupt(fiber).pipe(Effect.asVoid), { name: `externalStore:${fieldPath}:writeback` })
  })
