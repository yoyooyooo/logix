import * as Logix from '@logix/core'
import type { DevtoolsSnapshot } from '../snapshot.js'
import type { DevtoolsSettings, DevtoolsState, OperationSummary, TimelineEntry } from './model.js'
import { defaultSettings, emptyDevtoolsState, type DevtoolsSelectionOverride } from './model.js'

// Devtools 内部使用的简单路径读取工具：
// - 仅支持用 "." 分隔的嵌套字段路径，例如 "profile.name"；
// - 用于在 Timeline 过滤时比较某个字段在前后两帧中的值是否发生变化。
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

// 为缺少显式 timestamp 的 Debug.Event 提供“首次观察时间戳”：
// - Snapshot 中的事件对象在 ring buffer 内保持引用稳定；
// - 用 WeakMap 记录首次出现的时间，避免在每次 compute 时重置时间线。
const timestampByEvent = new WeakMap<object, number>()
const getEventTimestamp = (event: Logix.Debug.Event): number => {
  const ts = (event as any)?.timestamp
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    return ts
  }
  if (event === null || typeof event !== 'object') {
    return Date.now()
  }
  const key = event as unknown as object
  const existing = timestampByEvent.get(key)
  if (existing != null) {
    return existing
  }
  const now = Date.now()
  timestampByEvent.set(key, now)
  return now
}

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

const collectTraitConverge = (window: TraitConvergeWindow, event: Logix.Debug.Event): void => {
  if (!event || typeof event !== 'object') return
  if (event.type !== 'state:update') return

  const traitSummary = (event as any).traitSummary
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

  const txnId = typeof (event as any).txnId === 'string' ? ((event as any).txnId as string) : undefined
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
  events: ReadonlyArray<Logix.Debug.Event>,
  settings: DevtoolsSettings,
): ReadonlyArray<OperationSummary> => {
  const windowMs = settings.operationWindowMs ?? 1000
  const summaries: OperationSummary[] = []

  let current: {
    startedAt: number
    endedAt: number
    eventCount: number
    renderCount: number
    txnIds: Set<string>
    traitConverge: TraitConvergeWindow
  } | undefined

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

  for (const event of events) {
    const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event)
    if (!ref) continue
    const ts = getEventTimestamp(event)

    const isEntrance = event.type === 'action:dispatch' || ref.kind === 'action' || ref.kind === 'devtools'

    if (!current) {
      current = {
        startedAt: ts,
        endedAt: ts,
        eventCount: 1,
        renderCount: ref.kind === 'react-render' ? 1 : 0,
        txnIds: new Set(ref.txnId ? [ref.txnId] : []),
        traitConverge: emptyTraitConvergeWindow(),
      }
      collectTraitConverge(current.traitConverge, event)
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
      collectTraitConverge(current.traitConverge, event)
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
    collectTraitConverge(current.traitConverge, event)
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

  // 1) 从 Debug 事件构建 Runtime / Module / Instance 视图
  const runtimeOrder: string[] = []
  const seenRuntime = new Set<string>()
  const activeInstances = new Map<string, Map<string, Set<string>>>()

  for (const event of snapshot.events) {
    const runtimeLabel = 'runtimeLabel' in event && event.runtimeLabel ? event.runtimeLabel : 'unknown'
    if (!seenRuntime.has(runtimeLabel)) {
      seenRuntime.add(runtimeLabel)
      runtimeOrder.push(runtimeLabel)
    }

    const moduleId = 'moduleId' in event && event.moduleId ? event.moduleId : undefined
    const runtimeId = 'runtimeId' in event && event.runtimeId ? event.runtimeId : undefined

    if (moduleId && runtimeId && (event.type === 'module:init' || event.type === 'module:destroy')) {
      const byModule = activeInstances.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const set = byModule.get(moduleId) ?? new Set<string>()

      if (event.type === 'module:init') {
        set.add(runtimeId)
      } else {
        set.delete(runtimeId)
      }

      if (set.size > 0) {
        byModule.set(moduleId, set)
      } else {
        byModule.delete(moduleId)
      }

      if (byModule.size > 0) {
        activeInstances.set(runtimeLabel, byModule)
      } else {
        activeInstances.delete(runtimeLabel)
      }
    }
  }

  // 若 DebugSink 中未收到 module:init/module:destroy 事件（例如某些 Runtime 装配路径仅记录 action:dispatch），
  // 则回退为基于「出现过 action/state 事件」推导实例集合，保证 Devtools 至少能枚举出可见的 Runtime/Module。
  if (activeInstances.size === 0 && snapshot.events.length > 0) {
    for (const event of snapshot.events) {
      const runtimeLabel = 'runtimeLabel' in event && event.runtimeLabel ? event.runtimeLabel : 'unknown'
      const moduleId = 'moduleId' in event && event.moduleId ? event.moduleId : undefined
      const runtimeId = 'runtimeId' in event && event.runtimeId ? event.runtimeId : undefined

      if (!moduleId || !runtimeId) continue

      const byModule = activeInstances.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const set = byModule.get(moduleId) ?? new Set<string>()
      set.add(runtimeId)
      byModule.set(moduleId, set)
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

  // 若事件窗口被清空（例如用户点击 Clear），但 Module 实例仍然存活，
  // 或者仅依赖 state:update 快照（latestStates）也能推导出活跃实例，
  // 则基于 latestStates + instances 做一次兜底构建，保证左侧 Runtime/Module 列至少可见。
  if (runtimeViews.length === 0 && (snapshot.latestStates.size > 0 || snapshot.instances.size > 0)) {
    const byRuntime = new Map<string, Map<string, Set<string>>>()

    for (const [key] of snapshot.latestStates) {
      const [runtimeLabel, moduleId, runtimeId] = key.split('::')
      if (!runtimeLabel || !moduleId || !runtimeId) continue

      // 仅保留当前仍存活的实例：通过 ModuleInstanceCounter 的 snapshot 过滤。
      const instanceKey = `${runtimeLabel}::${moduleId}`
      const liveCount = snapshot.instances.get(instanceKey)
      if (!liveCount || liveCount <= 0) continue

      const byModule = byRuntime.get(runtimeLabel) ?? new Map<string, Set<string>>()
      const ids = byModule.get(moduleId) ?? new Set<string>()
      ids.add(runtimeId)
      byModule.set(moduleId, ids)
      byRuntime.set(runtimeLabel, byModule)
    }

    // 若 latestStates 未能提供任何活跃实例（极端场景），则退化为只使用 instances 的计数视图。
    if (byRuntime.size === 0 && snapshot.instances.size > 0) {
      for (const [key, count] of snapshot.instances) {
        if (!count || count <= 0) continue
        const [runtimeLabel, moduleId] = key.split('::')
        if (!runtimeLabel || !moduleId) continue

        const byModule = byRuntime.get(runtimeLabel) ?? new Map<string, Set<string>>()
        const ids = byModule.get(moduleId) ?? new Set<string>()
        // 在仅有计数信息时，无法还原真实 runtimeId，改为生成占位 ID，
        // 仅用于展示“实例数量”，后续一旦有真实事件到达，下一次 compute 会用真实 ID 覆盖。
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

  // 2) 选择 Runtime / Module / Instance（带容错）
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

  // 注意：selectedEventIndex / selectedFieldPath 需要支持“显式清空”的语义，
  // 因此不能简单用 `!== undefined` 作为是否提供 override 的判断条件。
  const hasSelectedEventIndexOverride = Object.prototype.hasOwnProperty.call(overrides, 'selectedEventIndex')
  const preferEventIndex = hasSelectedEventIndexOverride ? overrides.selectedEventIndex : base.selectedEventIndex

  const hasSelectedFieldPathOverride = Object.prototype.hasOwnProperty.call(overrides, 'selectedFieldPath')
  const selectedFieldPath = hasSelectedFieldPathOverride ? overrides.selectedFieldPath : (base as any).selectedFieldPath

  // 3) 构建当前选择下的事件时间线（包含每条事件后的 state），并可选按 fieldPath 做关联筛选
  const timeline: TimelineEntry[] = []
  const lastStateByInstance = new Map<string, unknown>()

  if (selectedRuntime) {
    for (const event of snapshot.events) {
      const runtimeLabel = 'runtimeLabel' in event && event.runtimeLabel ? event.runtimeLabel : 'unknown'
      if (runtimeLabel !== selectedRuntime) continue

      const moduleId = 'moduleId' in event && event.moduleId ? event.moduleId : undefined
      if (selectedModule && moduleId !== selectedModule) continue

      const runtimeId = 'runtimeId' in event && event.runtimeId ? event.runtimeId : undefined
      if (selectedInstance && runtimeId && runtimeId !== selectedInstance) {
        continue
      }

      const instanceKey = `${runtimeLabel}::${moduleId ?? 'unknown'}::${runtimeId ?? 'unknown'}`

      // 若指定了 selectedFieldPath，则只保留与该字段显式相关的事件：
      // - state:update：仅保留该字段值发生变化的帧（以及首帧）；
      // - trace:effectop：仅当其 data.meta.fieldPath 或 data.meta.deps 命中该字段时保留；
      // - 其他事件：在筛选模式下暂时丢弃，避免噪音。
      if (selectedFieldPath) {
        if (event.type === 'state:update') {
          // 在下面 setState 分支中按字段变化决定是否加入时间线。
        } else if (typeof event.type === 'string' && event.type.startsWith('trace:effectop')) {
          const data = (event as any).data as any
          const meta = data && typeof data === 'object' ? (data as any).meta : undefined
          const fieldPathMatch =
            meta &&
            (meta.fieldPath === selectedFieldPath ||
              (Array.isArray(meta.deps) && meta.deps.includes(selectedFieldPath)))
          if (!fieldPathMatch) {
            continue
          }
        } else {
          // 其他事件在字段筛选模式下不保留。
          continue
        }
      }

      if (event.type === 'state:update') {
        const state = (event as any).state
        const prev = lastStateByInstance.get(instanceKey)
        lastStateByInstance.set(instanceKey, state)

        if (!selectedFieldPath) {
          // 未开启字段筛选：保留所有状态帧。
          timeline.push({ event, stateAfter: state })
        } else {
          // 开启字段筛选：仅在该字段值发生变化时保留该帧。
          if (prev === undefined) {
            // 首帧：始终保留，作为 baseline。
            timeline.push({ event, stateAfter: state })
          } else {
            const prevValue = getAtPath(prev, selectedFieldPath)
            const nextValue = getAtPath(state, selectedFieldPath)
            if (!Object.is(prevValue, nextValue)) {
              timeline.push({ event, stateAfter: state })
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
    const summaries = groupEventsIntoOperationWindows(timeline.map((e) => e.event as Logix.Debug.Event), baseSettings)
    return summaries.length > 0 ? summaries[summaries.length - 1] : undefined
  })()

  // Timeline 事件窗口：
  // - 使用 settings.eventBufferSize 作为“保留多少条事件用于 Devtools 视图”的统一入口；
  // - 默认 500（与 Hub ring buffer 默认值一致），避免 Overview 只看到最后一批 50 条事件而丢失时间分布信息。
  const windowSize = Math.max(1, Math.floor(baseSettings.eventBufferSize ?? defaultSettings.eventBufferSize))
  const slicedTimeline = timeline.length > windowSize ? timeline.slice(timeline.length - windowSize) : timeline

  let selectedEventIndex: number | undefined
  if (slicedTimeline.length === 0) {
    selectedEventIndex = undefined
  } else if (preferEventIndex != null && preferEventIndex >= 0 && preferEventIndex < slicedTimeline.length) {
    // 仅当用户显式选择某个事件时才维持选中态；
    // 否则保持“未选中事件”，由 activeState 回退到最新状态。
    selectedEventIndex = preferEventIndex
  } else {
    selectedEventIndex = undefined
  }

  // 4) 选中事件对应的状态（若该事件无 state，则退化为最新状态）
  let activeState: unknown = undefined
  const userSelectedEvent = overrides.userSelectedEvent === true

  if (selectedEventIndex != null && selectedEventIndex >= 0 && selectedEventIndex < slicedTimeline.length) {
    const entry = slicedTimeline[selectedEventIndex]
    if (entry.stateAfter !== undefined) {
      activeState = entry.stateAfter
    }
  }

  // 仅在「非用户主动选中事件」的情况下才回退到 latestStates；
  // 用户点击某条事件时，即便该事件没有独立快照，也保留 undefined，
  // 让 Inspector 明确展示“当前事件没有状态快照”。
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
