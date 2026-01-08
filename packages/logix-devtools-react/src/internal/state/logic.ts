import * as Logix from '@logixjs/core'
import { Effect, Stream } from 'effect'
import {
  clearDevtoolsEvents,
  clearDevtoolsSnapshotOverride,
  DevtoolsSnapshotStore,
  hasDevtoolsSnapshotOverride,
  setDevtoolsSnapshotOverride,
  type DevtoolsSnapshot,
} from '../snapshot/index.js'
import { computeDevtoolsState } from './compute.js'
import type { DevtoolsState } from './model.js'
import { persistLayoutToStorage } from './storage.js'
import { DevtoolsModule } from './module.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const normalizeRuntimeDebugEventRef = (value: unknown): Logix.Debug.RuntimeDebugEventRef | null => {
  if (!isRecord(value)) return null

  const kind = asNonEmptyString(value.kind)
  const label = asNonEmptyString(value.label)
  const moduleId = asNonEmptyString(value.moduleId)
  const instanceId = asNonEmptyString((value as any).instanceId)
  const timestamp = asFiniteNumber(value.timestamp)

  if (!kind || !label || !moduleId || !instanceId || timestamp === undefined) {
    return null
  }

  return { ...(value as any), instanceId } as Logix.Debug.RuntimeDebugEventRef
}

// Helper to create a stream from DOM events
const fromDomEvent = <K extends keyof WindowEventMap>(event: K): Stream.Stream<WindowEventMap[K]> =>
  Stream.async<WindowEventMap[K]>((emit) => {
    const handler = (e: WindowEventMap[K]) => emit.single(e)
    window.addEventListener(event, handler)
    return Effect.sync(() => window.removeEventListener(event, handler))
  })

export const DevtoolsLogic = DevtoolsModule.logic<DevtoolsSnapshotStore>(($) => ({
  setup: $.lifecycle.onStart(
    Effect.gen(function* () {
      const snapshotStore = yield* DevtoolsSnapshotStore

      // Initialization: sync once with the current snapshot.
      const initialSnapshot = yield* snapshotStore.get
      yield* $.state.update((prev) =>
        computeDevtoolsState(prev as DevtoolsState | undefined, initialSnapshot, {
          userSelectedEvent: false,
        }),
      )
    }),
  ),

  // run section: initialize snapshot subscription + register all onAction watchers and dragging logic.
  run: Effect.gen(function* () {
    const snapshotStore = yield* DevtoolsSnapshotStore

    // Subscribe to Snapshot changes: recompute DevtoolsState on every Snapshot update.
    yield* $.on(snapshotStore.changes).runFork((snapshot) =>
      $.state.update((prev) =>
        computeDevtoolsState(prev as DevtoolsState | undefined, snapshot, {
          userSelectedEvent: false,
        }),
      ),
    )

    // Dragging logic
    yield* $.onAction('resizeStart').runFork((action) =>
      Effect.gen(function* () {
        const edge = action.payload.edge

        // Signal dragging started: only update layout.isDragging; do not recompute Snapshot-derived views.
        yield* $.state.update((prev) => {
          const current = prev as DevtoolsState
          return {
            ...current,
            layout: {
              ...current.layout,
              isDragging: true,
            },
          }
        })

        const dragStream = fromDomEvent('mousemove').pipe(
          Stream.interruptWhen(
            Effect.race(
              fromDomEvent('mouseup').pipe(Stream.runHead),
              // Safety fallback
              Effect.never,
            ),
          ),
          Stream.tap((e) => {
            return $.state.update((prev) => {
              const current = prev as DevtoolsState
              const { height, marginLeft, marginRight } = current.layout
              const winH = window.innerHeight
              const winW = window.innerWidth

              let nextHeight = height
              let nextMarginLeft = marginLeft
              let nextMarginRight = marginRight

              if (edge === 'top') {
                const newHeight = winH - e.clientY - 16 // 16px bottom margin
                nextHeight = Math.max(200, Math.min(newHeight, winH - 100))
              } else if (edge === 'left') {
                const newMarginLeft = Math.max(16, e.clientX)
                const currentWidth = winW - newMarginLeft - marginRight
                if (currentWidth >= 300) {
                  nextMarginLeft = newMarginLeft
                }
              } else if (edge === 'right') {
                const newMarginRight = Math.max(16, winW - e.clientX)
                const currentWidth = winW - marginLeft - newMarginRight
                if (currentWidth >= 300) {
                  nextMarginRight = newMarginRight
                }
              }

              return {
                ...current,
                layout: {
                  ...current.layout,
                  height: nextHeight,
                  marginLeft: nextMarginLeft,
                  marginRight: nextMarginRight,
                  isDragging: true,
                },
              }
            })
          }),
          Stream.runDrain,
        )

        yield* dragStream

        // Finished dragging: only persist layout result.
        yield* $.state.update((prev) => {
          const current = prev as DevtoolsState
          const next: DevtoolsState = {
            ...current,
            layout: {
              ...current.layout,
              isDragging: false,
            },
          }
          persistLayoutToStorage(next.layout)
          return next
        })
      }),
    )

    // Behavior logic: keep only side-effectful clearEvents; pure state updates are handled by the Primary Reducer.
    yield* $.onAction('clearEvents').runFork(() =>
      Effect.sync(() => {
        clearDevtoolsEvents()
      }),
    )

    // EvidencePackage import: switch snapshot source to the imported snapshot and trigger a DevtoolsState recomputation.
    yield* $.onAction('importEvidenceJson').runFork((action) =>
      Effect.gen(function* () {
        const jsonText = String((action as any).payload ?? '').trim()
        if (!jsonText) return

        let parsed: unknown
        try {
          parsed = JSON.parse(jsonText) as unknown
        } catch {
          return
        }

        const evidence = Logix.Observability.importEvidencePackage(parsed)

        const events: Logix.Debug.RuntimeDebugEventRef[] = []
        for (const envelope of evidence.events) {
          if (envelope.type !== 'debug:event') continue
          const payload = envelope.payload as unknown
          const normalized = normalizeRuntimeDebugEventRef(payload)
          if (!normalized) continue
          events.push(normalized)
        }

        const snapshot: DevtoolsSnapshot = {
          snapshotToken: 0,
          instances: new Map(),
          events,
          latestStates: new Map(),
          latestTraitSummaries: new Map(),
          exportBudget: { dropped: 0, oversized: 0 },
        }

        setDevtoolsSnapshotOverride(snapshot, { kind: 'evidence', evidence })

        yield* $.state.update((prev) => {
          const next = computeDevtoolsState(prev as DevtoolsState | undefined, snapshot, {
            userSelectedEvent: false,
          })
          return {
            ...(next as DevtoolsState),
            timeTravel: undefined,
          }
        })
      }),
    )

    yield* $.onAction('clearImportedEvidence').runFork(() =>
      Effect.gen(function* () {
        if (!hasDevtoolsSnapshotOverride()) {
          return
        }

        clearDevtoolsSnapshotOverride()

        const snapshot = yield* snapshotStore.get

        yield* $.state.update((prev) => {
          const next = computeDevtoolsState(prev as DevtoolsState | undefined, snapshot, {
            userSelectedEvent: false,
          })
          return {
            ...(next as DevtoolsState),
            timeTravel: undefined,
          }
        })
      }),
    )

    // Time travel: trigger Runtime.applyTransactionSnapshot from Devtools.
    yield* $.onAction('timeTravelBefore').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
          txnId: string
        }
        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, payload.txnId, 'before')
      }),
    )

    yield* $.onAction('timeTravelAfter').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
          txnId: string
        }
        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, payload.txnId, 'after')
      }),
    )

    yield* $.onAction('timeTravelLatest').runFork((action) =>
      Effect.gen(function* () {
        const payload = (action as any).payload as {
          moduleId: string
          instanceId: string
        }

        const snapshot = yield* snapshotStore.get
        let baseTxnId: string | undefined

        for (const event of snapshot.events) {
          if (event.kind !== 'state' || event.label !== 'state:update') continue
          if (event.moduleId !== payload.moduleId) continue
          if (event.instanceId !== payload.instanceId) continue
          const txnId = event.txnId
          if (!txnId) continue
          const metaAny = event.meta as any
          const originKind =
            metaAny && typeof metaAny === 'object' ? ((metaAny as any).originKind as string | undefined) : undefined
          // Use only non-devtools transactions as the baseline for the "latest business state".
          if (originKind === 'devtools') continue
          baseTxnId = txnId
        }

        if (!baseTxnId) {
          return
        }

        yield* Logix.Runtime.applyTransactionSnapshot(payload.moduleId, payload.instanceId, baseTxnId, 'after')
      }),
    )
  }),
}))
