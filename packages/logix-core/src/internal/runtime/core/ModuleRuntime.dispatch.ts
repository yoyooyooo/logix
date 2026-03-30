import { Effect, PubSub } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import * as Debug from './DebugSink.js'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import * as ReducerDiagnostics from './ReducerDiagnostics.js'
import * as StateTransaction from './StateTransaction.js'
import { mutateWithPatchPaths } from './mutativePatches.js'
import type { TxnOriginOverride } from './TxnOriginOverride.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { RunWithStateTransaction, SetStateInternal } from './ModuleRuntime.transaction.js'
import type { EnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import type { ResolvedConcurrencyPolicy } from './ModuleRuntime.concurrencyPolicy.js'

type DispatchEntryPoint = 'dispatch' | 'dispatchBatch' | 'dispatchLowPriority'

const readClockMs = (): number => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

type ActionAnalysis = {
  readonly actionTag: string | undefined
  readonly actionTagNormalized: string
  readonly topicTagPrimary: string | undefined
  readonly topicTagSecondary: string | undefined
  readonly originOp: 'remove' | 'insert' | 'unset' | 'set'
}

type ActionPropagationTopicTarget<A> = {
  readonly topicTag: string
  readonly hub: PubSub.PubSub<A>
}

type ActionPropagationEntry<A> = {
  readonly action: A
  readonly analysis: ActionAnalysis
  readonly topicTargets: ReadonlyArray<ActionPropagationTopicTarget<A>>
  readonly fanoutCount: number
}

type ActionStateWritebackHandler<S, A> =
  | { readonly kind: 'update'; readonly run: (state: S, action: A) => S }
  | { readonly kind: 'mutate'; readonly run: (draft: S, action: A) => void }
  | { readonly kind: 'effect'; readonly run: (action: A) => Effect.Effect<void, never, any> }

type ActionTopicBatch<A> = {
  readonly topicTag: string
  readonly hub: PubSub.PubSub<A>
  readonly actions: ReadonlyArray<A>
  readonly actionTag: string | undefined
  readonly fanoutCount: number
}

type ActionPressureSource = {
  readonly dispatchEntry: DispatchEntryPoint
  readonly channel: 'main' | 'topic'
  readonly topicTag?: string
  readonly actionTag?: string
  readonly batchSize?: number
  readonly fanoutCount?: number
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
  readonly registerActionStateWriteback: (tag: string, handler: ActionStateWritebackHandler<S, A>) => void
  readonly dispatchWithOriginOverride: (action: A, override?: TxnOriginOverride) => Effect.Effect<void, never, any>
  readonly dispatchBatchWithOriginOverride: (
    actions: ReadonlyArray<A>,
    override?: TxnOriginOverride,
  ) => Effect.Effect<void, never, any>
  readonly dispatchLowPriorityWithOriginOverride: (
    action: A,
    override?: TxnOriginOverride,
  ) => Effect.Effect<void, never, any>
  readonly dispatch: (action: A) => Effect.Effect<void, never, any>
  readonly dispatchBatch: (actions: ReadonlyArray<A>) => Effect.Effect<void, never, any>
  readonly dispatchLowPriority: (action: A) => Effect.Effect<void, never, any>
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
  const actionStateWritebacks = new Map<string, Array<ActionStateWritebackHandler<S, A>>>()

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

  const registerActionStateWriteback = (tag: string, handler: ActionStateWritebackHandler<S, A>): void => {
    if (dispatchedTags.has(tag)) {
      throw ReducerDiagnostics.makeReducerError('ReducerLateRegistrationError', tag, optionsModuleId)
    }
    const existing = actionStateWritebacks.get(tag)
    if (existing) {
      existing.push(handler)
      return
    }
    actionStateWritebacks.set(tag, [handler])
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
          // - Otherwise record a whole-state replace marker (path="*") and infer best-effort dirty evidence at commit time.
          if (txnContext.current) {
            if (patchPaths.length > 0) {
              StateTransaction.updateDraft(txnContext, next)
              for (const path of patchPaths) {
                recordStatePatch(path, 'reducer')
              }
              return
            }

            StateTransaction.updateDraft(txnContext, next)
            recordStatePatch('*', 'reducer', prev, next)

            if (isDevEnv()) {
              yield* Debug.record({
                type: 'diagnostic',
                moduleId: optionsModuleId,
                instanceId,
                txnSeq: txnContext.current?.txnSeq,
                txnId: txnContext.current?.txnId,
                trigger: txnContext.current?.origin,
                code: 'state_transaction::dirty_evidence_inferred',
                severity: 'warning',
                message:
                  'Reducer writeback did not provide field-level patchPaths; using commit-time best-effort inference for dirty evidence.',
                hint: 'Prefer Logix.Module.Reducer.mutate(...) or $.state.mutate(...) to produce exact patchPaths; inference may degrade incremental scheduling under complex mutations.',
                kind: 'dirty_evidence_inferred:reducer',
              })
            }

            return
          }

          yield* setStateInternal(next, '*', 'reducer', undefined, next)
        }),
      ),
    )
  }

	
  const applyActionStateWritebacks = (action: A, analysis: ActionAnalysis): Effect.Effect<void, never, any> => {
    const tag = analysis.actionTag
    if (tag == null || actionStateWritebacks.size === 0) {
      return Effect.void
    }
    const handlers = actionStateWritebacks.get(tag.length > 0 ? tag : 'unknown')
    if (!handlers || handlers.length === 0) {
      return Effect.void
    }

    return Effect.gen(function* () {
      let currentState: S | undefined
      let pendingState: S | undefined
      let pendingWholeStateWrite = false
      let pendingChanged = false
      const pendingPatchPaths: Array<StateTransaction.StatePatchPath> = []

      const clearPending = (): void => {
        pendingState = undefined
        pendingWholeStateWrite = false
        pendingChanged = false
        pendingPatchPaths.length = 0
      }

      const flushPending = (): Effect.Effect<void, never, any> =>
        Effect.gen(function* () {
          if (!pendingChanged || pendingState === undefined) {
            clearPending()
            return
          }

          if (pendingWholeStateWrite) {
            yield* setStateInternal(pendingState, '*', 'unknown', undefined, pendingState)
          } else {
            for (const path of pendingPatchPaths) {
              recordStatePatch(path, 'unknown')
            }
            StateTransaction.updateDraft(txnContext, pendingState)
          }

          currentState = pendingState
          clearPending()
        })

      const getCurrentState = (): Effect.Effect<S, never, any> =>
        currentState === undefined
          ? readState.pipe(
              Effect.tap((state) =>
                Effect.sync(() => {
                  currentState = state
                }),
              ),
            )
          : Effect.succeed(currentState)

      for (const handler of handlers) {
        if (handler.kind === 'effect') {
          yield* flushPending()
          yield* handler.run(action)
          currentState = undefined
          continue
        }

        const prev = pendingState ?? (yield* getCurrentState())

        if (handler.kind === 'update') {
          const next = handler.run(prev, action)
          if (Object.is(next, prev)) {
            continue
          }
          pendingState = next
          pendingChanged = true
          pendingWholeStateWrite = true
          continue
        }

        const { nextState, patchPaths } = mutateWithPatchPaths(prev as S, (draft) => handler.run(draft as S, action))
        if (Object.is(nextState, prev)) {
          continue
        }

        pendingState = nextState
        pendingChanged = true

        if (!pendingWholeStateWrite) {
          for (const path of patchPaths) {
            pendingPatchPaths.push(path)
          }
        }
      }

      yield* flushPending()
    })
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

  const dispatchInTransaction = (action: A, analysis: ActionAnalysis): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      // Apply the primary reducer first (may be a no-op).
      yield* applyPrimaryReducer(action, analysis)
      yield* applyActionStateWritebacks(action, analysis)

      const unknownAction = declaredActionTags ? !declaredActionTags.has(analysis.actionTagNormalized) : false
      const current: any = txnContext.current
      const phaseTimingEnabled = current?.dispatchPhaseTimingEnabled === true

      // Record action dispatch (for Devtools/diagnostics).
      const actionRecordStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
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
      if (phaseTimingEnabled) {
        current.dispatchActionRecordMs =
          (typeof current.dispatchActionRecordMs === 'number' ? current.dispatchActionRecordMs : 0) +
          Math.max(0, readClockMs() - actionRecordStartedAtMs)
      }

      // actionsWithMeta$: provides stable txnSeq/txnId anchors for higher-level subscriptions (e.g. Process).
      if (current) {
        const meta: StateCommitMeta = {
          txnSeq: current.txnSeq,
          txnId: current.txnId,
          commitMode: ((current as any).commitMode ?? 'normal') as StateCommitMode,
          priority: ((current as any).priority ?? 'normal') as StateCommitPriority,
          originKind: current.origin.kind,
          originName: current.origin.name,
        }
        const actionCommitStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
        yield* PubSub.publish(actionCommitHub, { value: action, meta })
        if (phaseTimingEnabled) {
          current.dispatchActionCommitHubMs =
            (typeof current.dispatchActionCommitHubMs === 'number' ? current.dispatchActionCommitHubMs : 0) +
            Math.max(0, readClockMs() - actionCommitStartedAtMs)
          current.dispatchActionCount =
            (typeof current.dispatchActionCount === 'number' ? current.dispatchActionCount : 0) + 1
        }
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
        dispatchInTransaction(action, analysis) as Effect.Effect<void, never, never>,
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
          yield* (dispatchInTransaction(action, analysis) as Effect.Effect<void, never, never>)
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
              yield* (dispatchInTransaction(action, analysis) as Effect.Effect<void, never, never>)
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

  const publishActionWithPressureDiagnostics = (
    hub: PubSub.PubSub<A>,
    action: A,
    trigger: () => Debug.TriggerRef,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> => publishWithPressureDiagnostics(PubSub.publish(hub, action), trigger, resolvePolicy)

  const publishActionBatchWithPressureDiagnostics = (
    hub: PubSub.PubSub<A>,
    actions: ReadonlyArray<A>,
    trigger: () => Debug.TriggerRef,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> => {
    if (actions.length === 0) {
      return Effect.void
    }
    if (actions.length === 1) {
      return publishActionWithPressureDiagnostics(hub, actions[0] as A, trigger, resolvePolicy)
    }
    return publishWithPressureDiagnostics(PubSub.publishAll(hub, actions), trigger, resolvePolicy)
  }

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

  const makeActionPressureSource = (args: ActionPressureSource): Record<string, unknown> => ({
    dispatchEntry: args.dispatchEntry,
    channel: args.channel,
    ...(typeof args.topicTag === 'string' ? { topicTag: args.topicTag } : {}),
    ...(typeof args.actionTag === 'string' ? { actionTag: args.actionTag } : {}),
    ...(typeof args.batchSize === 'number' ? { batchSize: args.batchSize } : {}),
    ...(typeof args.fanoutCount === 'number' ? { fanoutCount: args.fanoutCount } : {}),
  })

  const makeActionPropagationEntry = (action: A, analysis: ActionAnalysis): ActionPropagationEntry<A> => {
    const topicTargets: Array<ActionPropagationTopicTarget<A>> = []
    const primaryTopicTag = analysis.topicTagPrimary
    const primaryTopicHub = primaryTopicTag ? actionTagHubsByTag?.get(primaryTopicTag) : undefined
    if (primaryTopicHub && primaryTopicTag) {
      topicTargets.push({ topicTag: primaryTopicTag, hub: primaryTopicHub })
    }

    const secondaryTopicTag = analysis.topicTagSecondary
    const secondaryTopicHub = secondaryTopicTag ? actionTagHubsByTag?.get(secondaryTopicTag) : undefined
    if (secondaryTopicHub && secondaryTopicTag) {
      topicTargets.push({ topicTag: secondaryTopicTag, hub: secondaryTopicHub })
    }

    return {
      action,
      analysis,
      topicTargets,
      fanoutCount: topicTargets.length,
    }
  }

  const resolveSharedActionTag = (entries: ReadonlyArray<ActionPropagationEntry<A>>): string | undefined => {
    if (entries.length === 0) {
      return undefined
    }
    const first = entries[0]!.analysis.actionTagNormalized
    for (let index = 1; index < entries.length; index += 1) {
      if (entries[index]!.analysis.actionTagNormalized !== first) {
        return undefined
      }
    }
    return first
  }

  const groupTopicBatches = (entries: ReadonlyArray<ActionPropagationEntry<A>>): ReadonlyArray<ActionTopicBatch<A>> => {
    const grouped = new Map<
      string,
      {
        topicTag: string
        hub: PubSub.PubSub<A>
        actions: Array<A>
        actionTag: string | undefined
        fanoutCount: number
      }
    >()

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]!
      for (let topicIndex = 0; topicIndex < entry.topicTargets.length; topicIndex += 1) {
        const topicTarget = entry.topicTargets[topicIndex]!
        let topicBatch = grouped.get(topicTarget.topicTag)
        if (!topicBatch) {
          topicBatch = {
            topicTag: topicTarget.topicTag,
            hub: topicTarget.hub,
            actions: [],
            actionTag: entry.analysis.actionTagNormalized,
            fanoutCount: 0,
          }
          grouped.set(topicTarget.topicTag, topicBatch)
        }

        topicBatch.actions.push(entry.action)
        topicBatch.fanoutCount += entry.fanoutCount
        if (topicBatch.actionTag && topicBatch.actionTag !== entry.analysis.actionTagNormalized) {
          topicBatch.actionTag = undefined
        }
      }
    }

    return Array.from(grouped.values())
  }

  const publishActionPropagationBus = (
    entries: ReadonlyArray<ActionPropagationEntry<A>>,
    dispatchEntry: DispatchEntryPoint,
    resolvePolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      if (entries.length === 0) {
        return
      }

      const batchSize = entries.length
      let batchFanoutCount = 0
      for (let index = 0; index < entries.length; index += 1) {
        batchFanoutCount += entries[index]!.fanoutCount
      }
      const batchActionTag = batchSize === 1 ? entries[0]!.analysis.actionTagNormalized : resolveSharedActionTag(entries)
      if (batchSize === 1) {
        yield* publishActionWithPressureDiagnostics(
          actionHub,
          entries[0]!.action,
          () => ({
            kind: 'actionHub',
            name: 'publish',
            details: makeActionPressureSource({
              dispatchEntry,
              channel: 'main',
              actionTag: batchActionTag,
              batchSize,
              fanoutCount: batchFanoutCount,
            }),
          }),
          resolvePolicy,
        )
      } else {
        const batchActions = new Array<A>(batchSize)
        for (let index = 0; index < batchSize; index += 1) {
          batchActions[index] = entries[index]!.action
        }
        yield* publishActionBatchWithPressureDiagnostics(
          actionHub,
          batchActions,
          () => ({
            kind: 'actionHub',
            name: 'publish',
            details: makeActionPressureSource({
              dispatchEntry,
              channel: 'main',
              actionTag: batchActionTag,
              batchSize,
              fanoutCount: batchFanoutCount,
            }),
          }),
          resolvePolicy,
        )
      }

      // Keep original order per topic stream while using publishAll for batch fan-out.
      const topicBatches = groupTopicBatches(entries)
      for (let topicIndex = 0; topicIndex < topicBatches.length; topicIndex += 1) {
        const topicBatch = topicBatches[topicIndex]!
        yield* publishActionBatchWithPressureDiagnostics(
          topicBatch.hub,
          topicBatch.actions,
          () => ({
            kind: 'actionTopicHub',
            name: 'publish',
            details: makeActionPressureSource({
              dispatchEntry,
              channel: 'topic',
              topicTag: topicBatch.topicTag,
              actionTag: topicBatch.actionTag,
              batchSize: topicBatch.actions.length,
              fanoutCount: topicBatch.fanoutCount,
            }),
          }),
          resolvePolicy,
        )
      }
    })

  return {
    registerReducer,
    registerActionStateWriteback,
    dispatchWithOriginOverride: (action, override) => {
      const analysis = analyzeAction(action)
      const propagationEntry = makeActionPropagationEntry(action, analysis)
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatch(action, analysis, override)).pipe(
        Effect.flatMap(() => publishActionPropagationBus([propagationEntry], 'dispatch', resolvePolicy)),
      )
    },
    dispatchBatchWithOriginOverride: (actions, override) => {
      const analyses = new Array<ActionAnalysis>(actions.length)
      for (let index = 0; index < actions.length; index += 1) {
        analyses[index] = analyzeAction(actions[index] as A)
      }
      const propagationEntries = new Array<ActionPropagationEntry<A>>(actions.length)
      for (let index = 0; index < actions.length; index += 1) {
        propagationEntries[index] = makeActionPropagationEntry(actions[index] as A, analyses[index] as ActionAnalysis)
      }
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatchBatch(actions, analyses, override)).pipe(
        Effect.flatMap(() => publishActionPropagationBus(propagationEntries, 'dispatchBatch', resolvePolicy)),
      )
    },
    dispatchLowPriorityWithOriginOverride: (action, override) => {
      const analysis = analyzeAction(action)
      const propagationEntry = makeActionPropagationEntry(action, analysis)
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatchLowPriority(action, analysis, override)).pipe(
        Effect.flatMap(() => publishActionPropagationBus([propagationEntry], 'dispatchLowPriority', resolvePolicy)),
      )
    },
    // Note: publish is a lossless/backpressure channel and may wait.
    // Must run outside the transaction window (FR-012) and must not block the txnQueue consumer fiber (avoid deadlock).
    dispatch: (action) => {
      const analysis = analyzeAction(action)
      const propagationEntry = makeActionPropagationEntry(action, analysis)
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatch(action, analysis)).pipe(
        Effect.flatMap(() => publishActionPropagationBus([propagationEntry], 'dispatch', resolvePolicy)),
      )
    },
    dispatchBatch: (actions) => {
      const analyses = new Array<ActionAnalysis>(actions.length)
      for (let index = 0; index < actions.length; index += 1) {
        analyses[index] = analyzeAction(actions[index] as A)
      }
      const propagationEntries = new Array<ActionPropagationEntry<A>>(actions.length)
      for (let index = 0; index < actions.length; index += 1) {
        propagationEntries[index] = makeActionPropagationEntry(actions[index] as A, analyses[index] as ActionAnalysis)
      }
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatchBatch(actions, analyses)).pipe(
        Effect.flatMap(() => publishActionPropagationBus(propagationEntries, 'dispatchBatch', resolvePolicy)),
      )
    },
    dispatchLowPriority: (action) => {
      const analysis = analyzeAction(action)
      const propagationEntry = makeActionPropagationEntry(action, analysis)
      const resolvePolicy = makeLazyPolicyResolver()
      return enqueueTransaction(runDispatchLowPriority(action, analysis)).pipe(
        Effect.flatMap(() => publishActionPropagationBus([propagationEntry], 'dispatchLowPriority', resolvePolicy)),
      )
    },
  }
}
