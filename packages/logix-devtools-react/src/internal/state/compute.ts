import * as Logix from '@logix/core'
import type { DevtoolsSnapshot } from '../snapshot/index.js'
import type { DevtoolsSettings, DevtoolsState, OperationSummary, TimelineEntry } from './model.js'
import { defaultSettings, emptyDevtoolsState, type DevtoolsSelectionOverride } from './model.js'

// A simple path reader for Devtools internal use:
// - Only supports nested field paths separated by ".", e.g. "profile.name".
// - Used when filtering Timeline frames to compare whether a field value changed between two frames.
const getAtPath = (obj: unknown, path: string): unknown => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return undefined
  }
  const segments = path.split('.')
  let current: any = obj
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[segment]
  }
  return current
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Consumer-side digest gate: do not use rootIds -> rootPaths reverse-mapping when digest is missing (avoid showing wrong info).
// Note: Devtools does not reverse-map by default; rootPaths is only an optional helper field for export boundaries.
const gateDirtyRootPathsByDigest = (meta: unknown): unknown => {
  if (!isRecord(meta)) return meta

  const staticIrDigest = meta.staticIrDigest
  if (typeof staticIrDigest === 'string' && staticIrDigest.length > 0) {
    return meta
  }

  const dirtySet = meta.dirtySet
  if (!isRecord(dirtySet)) return meta

  if (!Array.isArray((dirtySet as any).rootPaths)) return meta

  return {
    ...meta,
    dirtySet: {
      ...dirtySet,
      rootPaths: undefined,
    },
  }
}

// Snapshot.events are already RuntimeDebugEventRef; timestamp always exists (core falls back to Date.now).
const getEventTimestamp = (event: Logix.Debug.RuntimeDebugEventRef): number => event.timestamp

type TraitConvergeStep = {
  stepId: string
  kind: 'computed' | 'link'
  fieldPath: string
  durationMs: number
  changed: boolean
  txnId?: string
}

type TraitConvergeWindow = {
  txnCount: number
  outcomes: {
    Converged: number
    Noop: number
    Degraded: number
  }
  degradedReasons: {
    budget_exceeded: number
    runtime_error: number
  }
  budgetMs?: number
  totalDurationMs: number
  executedSteps: number
  changedSteps: number
  top3: Array<TraitConvergeStep>
}

const emptyTraitConvergeWindow = (): TraitConvergeWindow => ({
  txnCount: 0,
  outcomes: {
    Converged: 0,
    Noop: 0,
    Degraded: 0,
  },
  degradedReasons: {
    budget_exceeded: 0,
    runtime_error: 0,
  },
  budgetMs: undefined,
  totalDurationMs: 0,
  executedSteps: 0,
  changedSteps: 0,
  top3: [],
})

const pushTop3 = (window: TraitConvergeWindow, step: TraitConvergeStep): void => {
  const next = [...window.top3, step].sort((a, b) => b.durationMs - a.durationMs).slice(0, 3)
  window.top3 = next
}

const collectTraitConverge = (window: TraitConvergeWindow, event: Logix.Debug.RuntimeDebugEventRef): void => {
  if (event.kind !== 'state' || event.label !== 'state:update') return

  const meta = event.meta as any
  const traitSummary = meta && typeof meta === 'object' ? (meta as any).traitSummary : undefined
  if (!traitSummary || typeof traitSummary !== 'object') return

  const converge = (traitSummary as any).converge
  if (!converge || typeof converge !== 'object') return

  window.txnCount += 1

  const outcome = (converge as any).outcome
  if (outcome === 'Converged') {
    window.outcomes.Converged += 1
  } else if (outcome === 'Noop') {
    window.outcomes.Noop += 1
  } else if (outcome === 'Degraded') {
    window.outcomes.Degraded += 1
  }

  const degradedReason = (converge as any).degradedReason
  if (degradedReason === 'budget_exceeded') {
    window.degradedReasons.budget_exceeded += 1
  } else if (degradedReason === 'runtime_error') {
    window.degradedReasons.runtime_error += 1
  }

  const budgetMs = (converge as any).budgetMs
  if (typeof budgetMs === 'number' && Number.isFinite(budgetMs)) {
    window.budgetMs = window.budgetMs != null ? Math.max(window.budgetMs, budgetMs) : budgetMs
  }

  const totalDurationMs = (converge as any).totalDurationMs
  if (typeof totalDurationMs === 'number' && Number.isFinite(totalDurationMs)) {
    window.totalDurationMs += totalDurationMs
  }

  const executedSteps = (converge as any).executedSteps
  if (typeof executedSteps === 'number' && Number.isFinite(executedSteps)) {
    window.executedSteps += executedSteps
  }

  const changedSteps = (converge as any).changedSteps
  if (typeof changedSteps === 'number' && Number.isFinite(changedSteps)) {
    window.changedSteps += changedSteps
  }

  const top3 = (converge as any).top3
  if (!Array.isArray(top3)) return

  const txnId = event.txnId
  for (const s of top3) {
    if (!s || typeof s !== 'object') continue
    const kind = (s as any).kind
    if (kind !== 'computed' && kind !== 'link') continue
    const fieldPath = typeof (s as any).fieldPath === 'string' ? ((s as any).fieldPath as string) : undefined
    const durationMs = (s as any).durationMs
    if (!fieldPath) continue
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) continue

    const step: TraitConvergeStep = {
      stepId: typeof (s as any).stepId === 'string' ? ((s as any).stepId as string) : `${kind}:${fieldPath}`,
      kind,
      fieldPath,
      durationMs,
      changed: Boolean((s as any).changed),
      txnId,
    }
    pushTop3(window, step)
  }
}

const groupEventsIntoOperationWindows = (
  events: ReadonlyArray<Logix.Debug.RuntimeDebugEventRef>,
  settings: DevtoolsSettings,
): ReadonlyArray<OperationSummary> => {
  const windowMs = settings.operationWindowMs ?? 1000
  const summaries: OperationSummary[] = []

  let current:
    | {
        startedAt: number
        endedAt: number
        eventCount: number
        renderCount: number
        txnIds: Set<string>
        traitConverge: TraitConvergeWindow
      }
    | undefined

  const flush = () => {
    if (!current) return
    const durationMs = Math.max(0, current.endedAt - current.startedAt)
    const traitConverge = current.traitConverge.txnCount > 0 ? current.traitConverge : undefined
    summaries.push({
      startedAt: current.startedAt,
      endedAt: current.endedAt,
      durationMs,
      eventCount: current.eventCount,
      renderCount: current.renderCount,
      txnCount: current.txnIds.size,
      traitConverge: traitConverge as any,
    })
    current = undefined
  }

  for (const ref of events) {
    const ts = getEventTimestamp(ref)

    const isEntrance = ref.kind === 'action' || ref.kind === 'devtools'

    if (!current) {
      current = {
        startedAt: ts,
        endedAt: ts,
        eventCount: 1,
        renderCount: ref.kind === 'react-render' ? 1 : 0,
        txnIds: new Set(ref.txnId ? [ref.txnId] : []),
        traitConverge: emptyTraitConvergeWindow(),
      }
      collectTraitConverge(current.traitConverge, ref)
      continue
    }

    const gap = ts - current.endedAt

    if (isEntrance || gap > windowMs) {
      flush()
      current = {
        startedAt: ts,
        endedAt: ts,
        eventCount: 1,
        renderCount: ref.kind === 'react-render' ? 1 : 0,
        txnIds: new Set(ref.txnId ? [ref.txnId] : []),
        traitConverge: emptyTraitConvergeWindow(),
      }
      collectTraitConverge(current.traitConverge, ref)
      continue
    }

    current.endedAt = ts
    current.eventCount += 1
    if (ref.kind === 'react-render') {
      current.renderCount += 1
    }
    if (ref.txnId) {
      current.txnIds.add(ref.txnId)
    }
    collectTraitConverge(current.traitConverge, ref)
  }

  flush()
  return summaries
}

export const computeDevtoolsState = (
  prev: DevtoolsState | undefined,
  snapshot: DevtoolsSnapshot,
  overrides: DevtoolsSelectionOverride = {},
): DevtoolsState => {
  const base = prev ?? emptyDevtoolsState
  const baseSettings: DevtoolsSettings = (base as any).settings ?? defaultSettings

  // 1) Build Runtime / Module / Instance views from Debug events
  const runtimeOrder: string[] = []
  const seenRuntime = new Set<string>()
  const activeInstances = new Map<string, Map<string, Set<string>>>()

  for (const event of snapshot.events) {
    const runtimeLabel = event.runtimeLabel ?? 'unknown'
    if (!seenRuntime.has(runtimeLabel)) {
      seenRuntime.add(runtimeLabel)
      runtimeOrder.push(runtimeLabel)
    }
    if (event.kind === 'lifecycle' && (event.label === 'module:init' || event.label === 'module:destroy')) {
      const byModule = activeInstances.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const set = byModule.get(event.moduleId) ?? new Set<string>()

      if (event.label === 'module:init') {
        set.add(event.instanceId)
      } else {
        set.delete(event.instanceId)
      }

      if (set.size > 0) {
        byModule.set(event.moduleId, set)
      } else {
        byModule.delete(event.moduleId)
      }

      if (byModule.size > 0) {
        activeInstances.set(runtimeLabel, byModule)
      } else {
        activeInstances.delete(runtimeLabel)
      }
    }
  }

  // If DebugSink did not receive module:init/module:destroy events (e.g. some runtime assembly paths only record action:dispatch),
  // fall back to inferring instances from "seen action/state events" so Devtools can still enumerate visible Runtime/Module.
  if (activeInstances.size === 0 && snapshot.events.length > 0) {
    for (const event of snapshot.events) {
      const runtimeLabel = event.runtimeLabel ?? 'unknown'
      const byModule = activeInstances.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const set = byModule.get(event.moduleId) ?? new Set<string>()
      set.add(event.instanceId)
      byModule.set(event.moduleId, set)
      activeInstances.set(runtimeLabel, byModule)
    }
  }

  const runtimeViews: {
    runtimeLabel: string
    modules: {
      moduleId: string
      count: number
      instances: string[]
      hasTraitBlueprint: boolean
      hasTraitRuntime: boolean
    }[]
  }[] = []
  for (const runtimeLabel of runtimeOrder) {
    const byModule = activeInstances.get(runtimeLabel)
    if (!byModule || byModule.size === 0) continue

    const modules: {
      moduleId: string
      count: number
      instances: string[]
      hasTraitBlueprint: boolean
      hasTraitRuntime: boolean
    }[] = []
    for (const [moduleId, ids] of byModule) {
      const instances = Array.from(ids).sort()
      const traits = Logix.Debug.getModuleTraitsById(moduleId)
      const hasTraitBlueprint = Boolean(traits?.program)
      const hasTraitRuntime = hasTraitBlueprint && instances.length > 0

      modules.push({
        moduleId,
        count: instances.length,
        instances,
        hasTraitBlueprint,
        hasTraitRuntime,
      })
    }
    modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId))

    runtimeViews.push({ runtimeLabel, modules })
  }

  // If the event window is cleared (e.g. user clicks Clear) but module instances are still alive,
  // or if we can infer active instances from state:update snapshots (latestStates),
  // do a fallback build from latestStates + instances so the left Runtime/Module list stays visible.
  if (runtimeViews.length === 0 && (snapshot.latestStates.size > 0 || snapshot.instances.size > 0)) {
    const byRuntime = new Map<string, Map<string, Set<string>>>()

    for (const [key] of snapshot.latestStates) {
      const [runtimeLabel, moduleId, instanceId] = key.split('::')
      if (!runtimeLabel || !moduleId || !instanceId) continue

      // Keep only currently alive instances: filter by ModuleRuntimeCounter snapshot.
      const instanceKey = `${runtimeLabel}::${moduleId}`
      const liveCount = snapshot.instances.get(instanceKey)
      if (!liveCount || liveCount <= 0) continue

      const byModule = byRuntime.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const ids = byModule.get(moduleId) ?? new Set<string>()
      ids.add(instanceId)
      byModule.set(moduleId, ids)
      byRuntime.set(runtimeLabel, byModule)
    }

    // If latestStates provides no active instances (extreme case), fall back to using instances-only count views.
    if (byRuntime.size === 0 && snapshot.instances.size > 0) {
      for (const [key, count] of snapshot.instances) {
        if (!count || count <= 0) continue
        const [runtimeLabel, moduleId] = key.split('::')
        if (!runtimeLabel || !moduleId) continue

        const byModule = byRuntime.get(runtimeLabel) ?? new Map<string, Set<string>>()
        const ids = byModule.get(moduleId) ?? new Set<string>()
        // With counts only we can't recover real instanceIds; generate placeholder IDs,
        // used only to display "instance count". Once real events arrive, the next compute will replace them with real IDs.
        for (let i = 0; i < count; i++) {
          ids.add(`instance-${i + 1}`)
        }
        byModule.set(moduleId, ids)
        byRuntime.set(runtimeLabel, byModule)
      }
    }

    runtimeViews.length = 0
    const orderedRuntimeLabels = Array.from(byRuntime.keys()).sort()
    for (const runtimeLabel of orderedRuntimeLabels) {
      const byModule = byRuntime.get(runtimeLabel)
      if (!byModule || byModule.size === 0) continue

      const modules: {
        moduleId: string
        count: number
        instances: string[]
        hasTraitBlueprint: boolean
        hasTraitRuntime: boolean
      }[] = []
      for (const [moduleId, ids] of byModule) {
        const instances = Array.from(ids).sort()
        const traits = Logix.Debug.getModuleTraitsById(moduleId)
        const hasTraitBlueprint = Boolean(traits?.program)
        const hasTraitRuntime = hasTraitBlueprint && instances.length > 0

        modules.push({
          moduleId,
          count: instances.length,
          instances,
          hasTraitBlueprint,
          hasTraitRuntime,
        })
      }
      modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      runtimeViews.push({ runtimeLabel, modules })
    }
  }

  const runtimeLabels = runtimeViews.map((r) => r.runtimeLabel)

  // 2) Select Runtime / Module / Instance (with tolerance)
  const preferRuntime = overrides.selectedRuntime !== undefined ? overrides.selectedRuntime : base.selectedRuntime
  const selectedRuntime = preferRuntime && runtimeLabels.includes(preferRuntime) ? preferRuntime : runtimeLabels[0]

  const runtimeView = runtimeViews.find((r) => r.runtimeLabel === selectedRuntime)
  const modulesForRuntime = runtimeView?.modules ?? []

  const preferModule = overrides.selectedModule !== undefined ? overrides.selectedModule : base.selectedModule
  const selectedModule =
    modulesForRuntime.length === 0
      ? undefined
      : preferModule && modulesForRuntime.some((m) => m.moduleId === preferModule)
        ? preferModule
        : modulesForRuntime[0]?.moduleId

  const moduleView = modulesForRuntime.find((m) => m.moduleId === selectedModule)
  const instancesForModule = moduleView?.instances ?? []

  const preferInstance = overrides.selectedInstance !== undefined ? overrides.selectedInstance : base.selectedInstance
  const selectedInstance =
    instancesForModule.length === 0
      ? undefined
      : preferInstance && instancesForModule.includes(preferInstance)
        ? preferInstance
        : instancesForModule[0]

  // Note: selectedEventIndex / selectedFieldPath must support explicit "clear" semantics,
  // so we cannot use `!== undefined` alone to determine whether an override is provided.
  const hasSelectedEventIndexOverride = Object.prototype.hasOwnProperty.call(overrides, 'selectedEventIndex')
  const preferEventIndex = hasSelectedEventIndexOverride ? overrides.selectedEventIndex : base.selectedEventIndex

  const hasSelectedFieldPathOverride = Object.prototype.hasOwnProperty.call(overrides, 'selectedFieldPath')
  const selectedFieldPath = hasSelectedFieldPathOverride ? overrides.selectedFieldPath : (base as any).selectedFieldPath

  // 3) Build the event timeline under the current selection (including state after each event),
  // and optionally correlate/filter by fieldPath.
  const timeline: TimelineEntry[] = []
  const lastStateByInstance = new Map<string, unknown>()

  if (selectedRuntime) {
    for (const event of snapshot.events) {
      const runtimeLabel = event.runtimeLabel ?? 'unknown'
      if (runtimeLabel !== selectedRuntime) continue

      const moduleId = event.moduleId
      if (selectedModule && moduleId !== selectedModule) continue

      const instanceId = event.instanceId
      if (selectedInstance && instanceId !== selectedInstance) {
        continue
      }

      const instanceKey = `${runtimeLabel}::${moduleId}::${instanceId}`

      // If selectedFieldPath is specified, only keep events explicitly related to that field:
      // - state:update: keep only frames where the field value changed (and the first frame).
      // - trace:effectop: keep only when data.meta.fieldPath or data.meta.deps hits the field.
      // - Other events: dropped in filter mode to reduce noise.
      if (selectedFieldPath) {
        if (event.kind === 'state' && event.label === 'state:update') {
          // In the state:update branch below, decide whether to include a frame based on field changes.
        } else {
          const metaAny = event.meta as any
          const opMeta = metaAny && typeof metaAny === 'object' ? (metaAny as any).meta : undefined
          const fieldPathMatch =
            opMeta &&
            (opMeta.fieldPath === selectedFieldPath ||
              (Array.isArray(opMeta.deps) && opMeta.deps.includes(selectedFieldPath)))
          if (!fieldPathMatch) {
            continue
          }
        }
      }

      if (event.kind === 'state' && event.label === 'state:update') {
        const gatedEvent: Logix.Debug.RuntimeDebugEventRef = {
          ...event,
          meta: gateDirtyRootPathsByDigest(event.meta),
        } as any

        const metaAny = gatedEvent.meta as any
        const state = metaAny && typeof metaAny === 'object' ? (metaAny as any).state : undefined
        const prev = lastStateByInstance.get(instanceKey)
        lastStateByInstance.set(instanceKey, state)

        if (!selectedFieldPath) {
          // No field filter: keep all state frames.
          timeline.push({ event: gatedEvent, stateAfter: state })
        } else {
          // Field filter on: keep a frame only when the field value changes.
          if (prev === undefined) {
            // First frame: always keep as the baseline.
            timeline.push({ event: gatedEvent, stateAfter: state })
          } else {
            const prevValue = getAtPath(prev, selectedFieldPath)
            const nextValue = getAtPath(state, selectedFieldPath)
            if (!Object.is(prevValue, nextValue)) {
              timeline.push({ event: gatedEvent, stateAfter: state })
            }
          }
        }
      } else {
        timeline.push({
          event,
          stateAfter: lastStateByInstance.get(instanceKey),
        })
      }
    }
  }

  const operationSummary = (() => {
    if (timeline.length === 0) return undefined
    const summaries = groupEventsIntoOperationWindows(
      timeline.map((e) => e.event as Logix.Debug.RuntimeDebugEventRef),
      baseSettings,
    )
    return summaries.length > 0 ? summaries[summaries.length - 1] : undefined
  })()

  // Timeline event window:
  // - Use settings.eventBufferSize as the single source of truth for "how many events to keep for Devtools views".
  // - Default 500 (aligned with Hub ring buffer default) to avoid Overview only seeing the last 50 events and losing time distribution.
  const windowSize = Math.max(1, Math.floor(baseSettings.eventBufferSize ?? defaultSettings.eventBufferSize))
  const slicedTimeline = timeline.length > windowSize ? timeline.slice(timeline.length - windowSize) : timeline

  let selectedEventIndex: number | undefined
  if (slicedTimeline.length === 0) {
    selectedEventIndex = undefined
  } else if (preferEventIndex != null && preferEventIndex >= 0 && preferEventIndex < slicedTimeline.length) {
    // Only keep selection when the user explicitly selected an event;
    // otherwise keep "no selected event" and let activeState fall back to the latest state.
    selectedEventIndex = preferEventIndex
  } else {
    selectedEventIndex = undefined
  }

  // 4) State for the selected event (if the event has no state, it may fall back to latest state)
  let activeState: unknown = undefined
  const userSelectedEvent = overrides.userSelectedEvent === true

  if (selectedEventIndex != null && selectedEventIndex >= 0 && selectedEventIndex < slicedTimeline.length) {
    const entry = slicedTimeline[selectedEventIndex]
    if (entry.stateAfter !== undefined) {
      activeState = entry.stateAfter
    }
  }

  // Only fall back to latestStates when the user did NOT explicitly select an event.
  // When the user clicks an event, even if it has no snapshot, keep undefined,
  // so Inspector can clearly show "this event has no state snapshot".
  if (!userSelectedEvent && activeState === undefined && selectedRuntime && selectedModule && selectedInstance) {
    const key = `${selectedRuntime}::${selectedModule}::${selectedInstance}`
    activeState = snapshot.latestStates.get(key)
  }

  // 5) Layout
  const layout = overrides.layout ? { ...base.layout, ...overrides.layout } : base.layout

  const open = overrides.open !== undefined ? overrides.open : base.open
  const theme = overrides.theme !== undefined ? overrides.theme : base.theme
  const timelineRange = (base as any).timelineRange
  const timeTravel = (base as any).timeTravel

  return {
    open,
    selectedRuntime,
    selectedModule,
    selectedInstance,
    selectedEventIndex,
    selectedFieldPath,
    runtimes: runtimeViews as DevtoolsState['runtimes'],
    timeline: slicedTimeline,
    operationSummary,
    activeState,
    layout,
    theme,
    timelineRange,
    timeTravel,
    settings: baseSettings,
  }
}
