import { Effect, FiberRef, PubSub } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import * as Debug from './DebugSink.js'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import * as ReducerDiagnostics from './ReducerDiagnostics.js'
import * as StateTransaction from './StateTransaction.js'
import { currentTxnOriginOverride, type TxnOriginOverride } from './TxnOriginOverride.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { RunWithStateTransaction, SetStateInternal } from './ModuleRuntime.transaction.js'
import type { EnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import type { ResolvedConcurrencyPolicy } from './ModuleRuntime.concurrencyPolicy.js'

type DispatchEntryPoint = 'dispatch' | 'dispatchBatch' | 'dispatchLowPriority'

type ActionAnalysis = {
  readonly actionTag: string | undefined
  readonly actionTagNormalized: string
  readonly topicTagPrimary: string | undefined
  readonly topicTagSecondary: string | undefined
  readonly originOp: 'remove' | 'insert' | 'unset' | 'set'
}

export const makeDispatchOps = <S, A>(args: {
  readonly optionsModuleId: string | undefined
  readonly instanceId: string
  readonly declaredActionTags?: ReadonlySet<string>
  readonly initialReducers?: Readonly<
    Record<string, (state: S, action: A, sink?: (path: StateTransaction.StatePatchPath) => void) => S>
  >
  readonly txnContext: StateTransaction.StateTxnContext<S>
  readonly readState: Effect.Effect<S>
  readonly setStateInternal: SetStateInternal<S>
  readonly recordStatePatch: (
    path: StateTransaction.StatePatchPath | undefined,
    reason: StateTransaction.PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
  readonly actionHub: PubSub.PubSub<A>
  readonly actionTagHubsByTag?: ReadonlyMap<string, PubSub.PubSub<A>>
  readonly actionCommitHub: PubSub.PubSub<StateChangeWithMeta<A>>
  readonly diagnostics: ConcurrencyDiagnostics
  readonly enqueueTransaction: EnqueueTransaction
  readonly resolveConcurrencyPolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>
  readonly runOperation: RunOperation
  readonly runWithStateTransaction: RunWithStateTransaction
  readonly isDevEnv: () => boolean
}): {
  readonly registerReducer: (tag: string, fn: (state: S, action: A) => S) => void
  readonly dispatch: (action: A) => Effect.Effect<void>
  readonly dispatchBatch: (actions: ReadonlyArray<A>) => Effect.Effect<void>
  readonly dispatchLowPriority: (action: A) => Effect.Effect<void>
} => {
  const {
    optionsModuleId,
    instanceId,
    declaredActionTags,
    initialReducers,
    txnContext,
    readState,
    setStateInternal,
    recordStatePatch,
    actionHub,
    actionTagHubsByTag,
    actionCommitHub,
    diagnostics,
    enqueueTransaction,
    resolveConcurrencyPolicy,
    runOperation,
    runWithStateTransaction,
    isDevEnv,
  } = args

  const resolveActionOriginOp = (tag: string): ActionAnalysis['originOp'] => {
    if (tag.includes('Remove') || tag.includes('remove')) return 'remove'
    if (
      tag.includes('Append') ||
      tag.includes('Prepend') ||
      tag.includes('Insert') ||
      tag.includes('Swap') ||
      tag.includes('Move') ||
      tag.includes('append') ||
      tag.includes('prepend') ||
      tag.includes('insert') ||
      tag.includes('swap') ||
      tag.includes('move')
    ) {
      return 'insert'
    }
    if (tag.includes('Unset') || tag.includes('unset')) return 'unset'
    return 'set'
  }

  const analyzeAction = (action: A): ActionAnalysis => {
    const tag = (action as any)?._tag
    const type = (action as any)?.type

    const actionTag =
      typeof tag === 'string' && tag.length > 0
        ? tag
        : typeof type === 'string' && type.length > 0
          ? type
          : tag != null
            ? String(tag)
            : type != null
              ? String(type)
              : undefined

    let topicTagPrimary: string | undefined
    if (typeof tag === 'string' && tag.length > 0) {
      topicTagPrimary = tag
    }

    let topicTagSecondary: string | undefined
    if (typeof type === 'string' && type.length > 0) {
      if (topicTagPrimary == null) {
        topicTagPrimary = type
      } else if (type !== topicTagPrimary) {
        topicTagSecondary = type
      }
    }

    if (topicTagPrimary == null && actionTag) {
      topicTagPrimary = actionTag
    }

    return {
      actionTag,
      actionTagNormalized: typeof actionTag === 'string' && actionTag.length > 0 ? actionTag : 'unknown',
      topicTagPrimary,
      topicTagSecondary,
      originOp: resolveActionOriginOp(actionTag ?? ''),
    }
  }

  // Primary reducer map: initial values come from options.reducers and can be extended at runtime via internal hooks (for $.reducer sugar).
  const reducerMap = new Map<string, (state: S, action: A) => S>()
  if (initialReducers) {
    for (const [key, fn] of Object.entries(initialReducers)) {
      reducerMap.set(key, fn as (state: S, action: A) => S)
    }
  }

  // Track whether an Action tag has been dispatched, for diagnosing config issues like late reducer registration.
  const dispatchedTags = new Set<string>()

  const registerReducer = (tag: string, fn: (state: S, action: A) => S): void => {
    if (reducerMap.has(tag)) {
      // Duplicate registration: throw a config error with extra context; catchAllCause emits diagnostics.
      throw ReducerDiagnostics.makeReducerError('ReducerDuplicateError', tag, optionsModuleId)
    }
    if (dispatchedTags.has(tag)) {
      // Registering after the tag has already been dispatched is a risky config; surfaced via a custom error type for diagnostics.
      throw ReducerDiagnostics.makeReducerError('ReducerLateRegistrationError', tag, optionsModuleId)
    }
    reducerMap.set(tag, fn)
  }

  const applyPrimaryReducer = (action: A, analysis: ActionAnalysis) => {
    const tag = analysis.actionTag
    if (tag == null || reducerMap.size === 0) {
      return Effect.void
    }
    const tagKey = tag.length > 0 ? tag : 'unknown'
    dispatchedTags.add(tagKey)
    const reducer = reducerMap.get(tagKey)
    if (!reducer) {
      return Effect.void
    }

    return readState.pipe(
      Effect.flatMap((prev) =>
        Effect.gen(function* () {
          const patchPaths: Array<StateTransaction.StatePatchPath> = []
          const sink = (path: StateTransaction.StatePatchPath): void => {
            if (typeof path === 'string') {
              if (path.length > 0) patchPaths.push(path)
              return
            }
            if (typeof path === 'number') {
              if (Number.isFinite(path)) patchPaths.push(Math.floor(path))
              return
            }
            if (path.length > 0) patchPaths.push(path)
          }

          const next = (reducer as any)(prev, action, sink) as S

          // No-op reducer: avoid dirty evidence to prevent redundant converge/validate full paths.
          if (Object.is(next, prev)) {
            return
          }

          // Prefer the traceable in-transaction path:
          // - If the reducer provides patchPaths (e.g. generated by Logix.Module.Reducer.mutate), record field-level patches.
          // - Otherwise deterministically fall back to dirtyAll (path="*") and emit a migration diagnostic in dev mode.
          if (txnContext.current) {
            if (patchPaths.length > 0) {
              StateTransaction.updateDraft(txnContext, next)
              for (const path of patchPaths) {
                recordStatePatch(path, 'reducer')
              }
              return
            }

            StateTransaction.updateDraft(txnContext, next)
            recordStatePatch('*', 'reducer', undefined, next)

            if (isDevEnv()) {
              yield* Debug.record({
                type: 'diagnostic',
                moduleId: optionsModuleId,
                instanceId,
                txnSeq: txnContext.current?.txnSeq,
                txnId: txnContext.current?.txnId,
                trigger: txnContext.current?.origin,
                code: 'state_transaction::dirty_all_fallback',
                severity: 'warning',
                message:
                  'Reducer writeback did not provide field-level dirty-set evidence; falling back to dirtyAll scheduling.',
                hint: 'Prefer Logix.Module.Reducer.mutate(...) or $.state.mutate(...) inside the transaction to produce field-level patchPaths.',
                kind: 'dirty_all_fallback:reducer',
              })
            }

            return
          }

          yield* setStateInternal(next, '*', 'reducer', undefined, next)
        }),
      ),
    )
  }

  const makeActionOrigin = (
    originName: string,
    action: A,
    analysis: ActionAnalysis,
    override?: TxnOriginOverride,
  ): StateTransaction.StateTxnOrigin => ({
    kind: override?.kind ?? 'action',
    name: override?.name ?? originName,
    details: {
      _tag: analysis.actionTagNormalized,
      path: typeof (action as any)?.payload?.path === 'string' ? ((action as any).payload.path as string) : undefined,
      op: analysis.originOp,
    },
  })

  const dispatchInTransaction = (action: A, analysis: ActionAnalysis): Effect.Effect<void> =>
    Effect.gen(function* () {
      // Apply the primary reducer first (may be a no-op).
      yield* applyPrimaryReducer(action, analysis)

      const unknownAction = declaredActionTags ? !declaredActionTags.has(analysis.actionTagNormalized) : false

      // Record action dispatch (for Devtools/diagnostics).
      yield* Debug.record({
        type: 'action:dispatch',
        moduleId: optionsModuleId,
        action,
        actionTag: analysis.actionTagNormalized,
        ...(unknownAction ? { unknownAction: true } : {}),
        instanceId,
        txnSeq: txnContext.current?.txnSeq,
        txnId: txnContext.current?.txnId,
      })

      // actionsWithMeta$: provides stable txnSeq/txnId anchors for higher-level subscriptions (e.g. Process).
      const current = txnContext.current
      if (current) {
        const meta: StateCommitMeta = {
          txnSeq: current.txnSeq,
          txnId: current.txnId,
          commitMode: ((current as any).commitMode ?? 'normal') as StateCommitMode,
          priority: ((current as any).priority ?? 'normal') as StateCommitPriority,
          originKind: current.origin.kind,
          originName: current.origin.name,
        }
        yield* PubSub.publish(actionCommitHub, { value: action, meta })
      }
    })

  const runDispatch = (action: A, analysis: ActionAnalysis, override?: TxnOriginOverride): Effect.Effect<void> =>
    runOperation(
      'action',
      'action:dispatch',
      {
        payload: action,
        meta: { moduleId: optionsModuleId, instanceId },
      },
      runWithStateTransaction(makeActionOrigin('dispatch', action, analysis, override), () =>
        dispatchInTransaction(action, analysis),
      ),
    ).pipe(Effect.asVoid)

  const runDispatchLowPriority = (action: A, analysis: ActionAnalysis, override?: TxnOriginOverride): Effect.Effect<void> =>
    runOperation(
      'action',
      'action:dispatchLowPriority',
      {
        payload: action,
        meta: { moduleId: optionsModuleId, instanceId },
      },
      runWithStateTransaction(makeActionOrigin('dispatchLowPriority', action, analysis, override), () =>
        Effect.gen(function* () {
          if (txnContext.current) {
            ;(txnContext.current as any).commitMode = 'lowPriority' as StateCommitMode
            ;(txnContext.current as any).priority = 'low' as StateCommitPriority
          }
          yield* dispatchInTransaction(action, analysis)
        }),
      ),
    ).pipe(Effect.asVoid)

  const runDispatchBatch = (
    actions: ReadonlyArray<A>,
    analyses: ReadonlyArray<ActionAnalysis>,
    override?: TxnOriginOverride,
  ): Effect.Effect<void> => {
    if (actions.length === 0) return Effect.void

    return runOperation(
      'action',
      'action:dispatchBatch',
      {
        payload: actions,
        meta: { moduleId: optionsModuleId, instanceId },
      },
      runWithStateTransaction(
        { kind: override?.kind ?? 'action', name: override?.name ?? 'dispatchBatch', details: { count: actions.length } } as any,
        () =>
          Effect.gen(function* () {
            if (txnContext.current) {
              ;(txnContext.current as any).commitMode = 'batch' as StateCommitMode
              ;(txnContext.current as any).priority = 'normal' as StateCommitPriority
            }
            for (let index = 0; index < actions.length; index += 1) {
              const action = actions[index] as A
              const analysis = analyses[index] as ActionAnalysis
              yield* dispatchInTransaction(action, analysis)
            }
          }),
      ),
    ).pipe(Effect.asVoid)
  }

  const publishWithPressureDiagnostics = (
    publish: Effect.Effect<unknown>,
    trigger: () => Debug.TriggerRef,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const startedAt = Date.now()
      yield* publish
      const elapsedMs = Date.now() - startedAt

      // fast-path: treat 0ms as "no backpressure wait observed" to avoid parsing policy per dispatch.
      if (elapsedMs <= 0) {
        return
      }

      const policy = yield* resolvePolicy()
      yield* diagnostics.emitPressureIfNeeded({
        policy,
        trigger: trigger(),
        saturatedDurationMs: elapsedMs,
      })
    })

  const makeLazyPolicyResolver = (): (() => Effect.Effect<ResolvedConcurrencyPolicy>) => {
    let cached: ResolvedConcurrencyPolicy | undefined
    return () =>
      cached
        ? Effect.succeed(cached)
        : resolveConcurrencyPolicy().pipe(
            Effect.tap((policy) =>
              Effect.sync(() => {
                cached = policy
              }),
            ),
          )
  }

  const publishActionToHubs = (
    action: A,
    analysis: ActionAnalysis,
    dispatchEntry: DispatchEntryPoint,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const primaryTopicTag = analysis.topicTagPrimary
      const primaryTopicHub = primaryTopicTag ? actionTagHubsByTag?.get(primaryTopicTag) : undefined
      const secondaryTopicTag = analysis.topicTagSecondary
      const secondaryTopicHub = secondaryTopicTag ? actionTagHubsByTag?.get(secondaryTopicTag) : undefined
      const fanoutCount = Number(primaryTopicHub != null) + Number(secondaryTopicHub != null)

      yield* publishWithPressureDiagnostics(PubSub.publish(actionHub, action), () => ({
        kind: 'actionHub',
        name: 'publish',
        details: {
          dispatchEntry,
          channel: 'main',
          fanoutCount,
        },
      }), resolvePolicy)

      if (primaryTopicHub && primaryTopicTag) {
        yield* publishWithPressureDiagnostics(PubSub.publish(primaryTopicHub, action), () => ({
          kind: 'actionTopicHub',
          name: 'publish',
          details: {
            dispatchEntry,
            channel: 'topic',
            topicTag: primaryTopicTag,
            fanoutCount,
          },
        }), resolvePolicy)
      }

      if (secondaryTopicHub && secondaryTopicTag) {
        yield* publishWithPressureDiagnostics(PubSub.publish(secondaryTopicHub, action), () => ({
          kind: 'actionTopicHub',
          name: 'publish',
          details: {
            dispatchEntry,
            channel: 'topic',
            topicTag: secondaryTopicTag,
            fanoutCount,
          },
        }), resolvePolicy)
      }
    })

  const publishBatchToHubs = (
    actions: ReadonlyArray<A>,
    analyses: ReadonlyArray<ActionAnalysis>,
    dispatchEntry: DispatchEntryPoint,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      if (actions.length === 0) {
        return
      }

      yield* publishWithPressureDiagnostics(PubSub.publishAll(actionHub, actions), () => ({
        kind: 'actionHub',
        name: 'publishAll',
        details: {
          dispatchEntry,
          channel: 'main',
          batchSize: actions.length,
        },
      }), resolvePolicy)

      for (let index = 0; index < actions.length; index += 1) {
        const action = actions[index] as A
        const analysis = analyses[index] as ActionAnalysis
        const actionTag = analysis.actionTag ?? 'unknown'
        const primaryTopicTag = analysis.topicTagPrimary
        const primaryTopicHub = primaryTopicTag ? actionTagHubsByTag?.get(primaryTopicTag) : undefined
        const secondaryTopicTag = analysis.topicTagSecondary
        const secondaryTopicHub = secondaryTopicTag ? actionTagHubsByTag?.get(secondaryTopicTag) : undefined
        const fanoutCount = Number(primaryTopicHub != null) + Number(secondaryTopicHub != null)

        if (primaryTopicHub && primaryTopicTag) {
          // Keep original batch order when fan-outing to tag streams.
          yield* publishWithPressureDiagnostics(PubSub.publish(primaryTopicHub, action), () => ({
            kind: 'actionTopicHub',
            name: 'publish',
            details: {
              dispatchEntry,
              channel: 'topic',
              topicTag: primaryTopicTag,
              actionTag,
              batchSize: actions.length,
              fanoutCount,
            },
          }), resolvePolicy)
        }

        if (secondaryTopicHub && secondaryTopicTag) {
          // Keep original batch order when fan-outing to tag streams.
          yield* publishWithPressureDiagnostics(PubSub.publish(secondaryTopicHub, action), () => ({
            kind: 'actionTopicHub',
            name: 'publish',
            details: {
              dispatchEntry,
              channel: 'topic',
              topicTag: secondaryTopicTag,
              actionTag,
              batchSize: actions.length,
              fanoutCount,
            },
          }), resolvePolicy)
        }
      }
    })

  return {
    registerReducer,
    // Note: publish is a lossless/backpressure channel and may wait.
    // Must run outside the transaction window (FR-012) and must not block the txnQueue consumer fiber (avoid deadlock).
    dispatch: (action) =>
      FiberRef.get(currentTxnOriginOverride).pipe(
        Effect.flatMap((override) => {
          const analysis = analyzeAction(action)
          const resolvePolicy = makeLazyPolicyResolver()
          return enqueueTransaction(runDispatch(action, analysis, override)).pipe(
            Effect.zipRight(publishActionToHubs(action, analysis, 'dispatch', resolvePolicy)),
          )
        }),
      ),
    dispatchBatch: (actions) =>
      FiberRef.get(currentTxnOriginOverride).pipe(
        Effect.flatMap((override) => {
          const analyses = new Array<ActionAnalysis>(actions.length)
          for (let index = 0; index < actions.length; index += 1) {
            analyses[index] = analyzeAction(actions[index] as A)
          }
          const resolvePolicy = makeLazyPolicyResolver()
          return enqueueTransaction(runDispatchBatch(actions, analyses, override)).pipe(
            Effect.zipRight(publishBatchToHubs(actions, analyses, 'dispatchBatch', resolvePolicy)),
          )
        }),
      ),
    dispatchLowPriority: (action) =>
      FiberRef.get(currentTxnOriginOverride).pipe(
        Effect.flatMap((override) => {
          const analysis = analyzeAction(action)
          const resolvePolicy = makeLazyPolicyResolver()
          return enqueueTransaction(runDispatchLowPriority(action, analysis, override)).pipe(
            Effect.zipRight(publishActionToHubs(action, analysis, 'dispatchLowPriority', resolvePolicy)),
          )
        }),
      ),
  }
}
