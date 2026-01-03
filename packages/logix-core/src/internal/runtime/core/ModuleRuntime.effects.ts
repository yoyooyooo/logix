import { Effect, Stream } from 'effect'
import * as Debug from './DebugSink.js'
import { toSerializableErrorSummary } from './errorSummary.js'

type Phase = 'setup' | 'run'

type AnyEffectHandler = (payload: unknown) => Effect.Effect<void, any, any>

type HandlerEntry = {
  readonly actionTag: string
  readonly sourceKey: string
  readonly handler: AnyEffectHandler
  readonly phase: Phase
  readonly logicUnitId: string
  readonly logicUnitLabel: string
  readonly logicUnitPath?: string
}

type LogicUnitState = {
  nextHandlerSeq: number
  handlerIds: WeakMap<AnyEffectHandler, string>
}

type ActionTagState = {
  readonly handlers: Map<string, HandlerEntry>
  watcherStarted: boolean
}

const resolveActionTag = (action: unknown): string | undefined => {
  const tag = (action as any)?._tag
  if (typeof tag === 'string' && tag.length > 0) return tag
  const type = (action as any)?.type
  if (typeof type === 'string' && type.length > 0) return type
  if (tag != null) return String(tag)
  if (type != null) return String(type)
  return undefined
}

const matchesActionTag = (action: unknown, actionTag: string): boolean => {
  const tag = resolveActionTag(action)
  return tag === actionTag
}

const getOrCreateLogicUnitState = (states: Map<string, LogicUnitState>, logicUnitId: string): LogicUnitState => {
  const existing = states.get(logicUnitId)
  if (existing) return existing
  const next: LogicUnitState = { nextHandlerSeq: 0, handlerIds: new WeakMap() }
  states.set(logicUnitId, next)
  return next
}

const getOrAssignHandlerId = (state: LogicUnitState, handler: AnyEffectHandler): string => {
  const existing = state.handlerIds.get(handler)
  if (existing) return existing
  state.nextHandlerSeq += 1
  const id = `h${state.nextHandlerSeq}`
  state.handlerIds.set(handler, id)
  return id
}

export type RegisterEffectArgs = {
  readonly actionTag: string
  readonly handler: AnyEffectHandler
  readonly phase: Phase
  readonly logicUnit?: {
    readonly logicUnitId: string
    readonly logicUnitLabel: string
    readonly path?: string
  }
}

export const makeEffectsRegistry = (args: {
  readonly moduleId: string | undefined
  readonly instanceId: string
  readonly actions$: Stream.Stream<unknown>
}): {
  readonly registerEffect: (
    params: RegisterEffectArgs,
  ) => Effect.Effect<{ readonly sourceKey: string; readonly duplicate: boolean }, never, any>
} => {
  const { moduleId, instanceId, actions$ } = args

  const logicUnitStates = new Map<string, LogicUnitState>()
  const tagStates = new Map<string, ActionTagState>()

  const getOrCreateTagState = (actionTag: string): ActionTagState => {
    const existing = tagStates.get(actionTag)
    if (existing) return existing
    const next: ActionTagState = { handlers: new Map(), watcherStarted: false }
    tagStates.set(actionTag, next)
    return next
  }

  const startWatcherIfNeeded = (actionTag: string, state: ActionTagState): Effect.Effect<void, never, any> => {
    if (state.watcherStarted) return Effect.void
    state.watcherStarted = true

    const program = Stream.runForEach(actions$.pipe(Stream.filter((a) => matchesActionTag(a, actionTag))), (action) =>
      Effect.gen(function* () {
        const entries = Array.from(state.handlers.values())
        if (entries.length === 0) return

        const payload = (action as any)?.payload

        yield* Effect.forEach(
          entries,
          (entry) =>
            Effect.forkScoped(
              Effect.gen(function* () {
                const exit = yield* Effect.exit(entry.handler(payload))
                if (exit._tag === 'Success') return

                const { errorSummary, downgrade } = toSerializableErrorSummary(exit.cause)
                const downgradeHint = downgrade ? ` (downgrade=${downgrade})` : ''

                yield* Debug.record({
                  type: 'diagnostic',
                  moduleId,
                  instanceId,
                  code: 'effects::handler_failure',
                  severity: 'error',
                  message: `Effect handler failed for actionTag="${entry.actionTag}" sourceKey="${entry.sourceKey}".${downgradeHint}`,
                  hint: `${errorSummary.name ? `${errorSummary.name}: ` : ''}${errorSummary.message}`,
                  actionTag: entry.actionTag,
                  kind: 'effect_handler_failure',
                  trigger: {
                    kind: 'effect',
                    name: 'handler',
                    details: {
                      actionTag: entry.actionTag,
                      sourceKey: entry.sourceKey,
                      logicUnitId: entry.logicUnitId,
                    },
                  },
                })
              }),
            ),
          { discard: true },
        )
      }),
    ).pipe(
      Effect.catchAllCause((cause) =>
        Debug.record({
          type: 'diagnostic',
          moduleId,
          instanceId,
          code: 'effects::watcher_crashed',
          severity: 'error',
          message: `Effect watcher crashed for actionTag="${actionTag}".`,
          hint: toSerializableErrorSummary(cause).errorSummary.message,
          actionTag,
          kind: 'effect_watcher_crashed',
        }),
      ),
    )

    return Effect.forkScoped(program).pipe(Effect.asVoid)
  }

  const registerEffect = (params: RegisterEffectArgs) =>
    Effect.gen(function* () {
      const actionTag = params.actionTag
      const handler = params.handler

      const logicUnitId = params.logicUnit?.logicUnitId ?? 'unknown'
      const logicUnitLabel = params.logicUnit?.logicUnitLabel ?? `logicUnit:${logicUnitId}`
      const logicUnitPath = params.logicUnit?.path

      const unitState = getOrCreateLogicUnitState(logicUnitStates, logicUnitId)
      const handlerId = getOrAssignHandlerId(unitState, handler)
      const sourceKey = `${logicUnitId}::${handlerId}`

      const tagState = getOrCreateTagState(actionTag)

      const duplicate = tagState.handlers.has(sourceKey)
      if (duplicate) {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId,
          instanceId,
          code: 'effects::duplicate_registration',
          severity: 'warning',
          message: `Duplicate effect registration ignored for actionTag="${actionTag}" sourceKey="${sourceKey}".`,
          hint:
            'The runtime de-duplicates effect handlers by (actionTag, sourceKey). ' +
            'If you see this unexpectedly, check repeated setup registration or accidental double-mounting.',
          actionTag,
          kind: 'effect_duplicate_registration',
          trigger: {
            kind: 'effect',
            name: 'register',
            details: {
              actionTag,
              sourceKey,
              phase: params.phase,
              logicUnitId,
              logicUnitLabel,
              logicUnitPath,
            },
          },
        })
        return { sourceKey, duplicate: true } as const
      }

      tagState.handlers.set(sourceKey, {
        actionTag,
        sourceKey,
        handler,
        phase: params.phase,
        logicUnitId,
        logicUnitLabel,
        logicUnitPath,
      })

      if (params.phase === 'run') {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId,
          instanceId,
          code: 'effects::dynamic_registration',
          severity: 'warning',
          message: `Effect registered in run phase for actionTag="${actionTag}" sourceKey="${sourceKey}".`,
          hint: 'Run-phase registration only affects future actions; prefer registering effects during setup for deterministic behavior.',
          actionTag,
          kind: 'effect_dynamic_registration',
          trigger: {
            kind: 'effect',
            name: 'register:run',
            details: { actionTag, sourceKey, logicUnitId, logicUnitLabel, logicUnitPath },
          },
        })
      }

      yield* startWatcherIfNeeded(actionTag, tagState)
      return { sourceKey, duplicate: false } as const
    })

  return { registerEffect }
}
