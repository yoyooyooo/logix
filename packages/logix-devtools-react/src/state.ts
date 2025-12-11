import * as Logix from '@logix/core'
import { Effect, Layer, Runtime as EffectRuntime, Schema, Stream } from 'effect'
import {
  clearDevtoolsEvents,
  getDevtoolsSnapshot,
  subscribeDevtoolsSnapshot,
  type DevtoolsSnapshot,
} from './snapshot.js'

// DevtoolsModule State & Logic：只负责“如何从 Snapshot 派生 Devtools 视图状态”，
// 不直接耦合 React，供 index.tsx 作为 UI 层消费。

const TimelineEntrySchema = Schema.Struct({
  event: Schema.Any,
  stateAfter: Schema.optional(Schema.Any),
})
type TimelineEntry = Schema.Schema.Type<typeof TimelineEntrySchema>

const TriggerLayoutSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  isDragging: Schema.Boolean,
})

const DevtoolsStateSchema = Schema.Struct({
  open: Schema.Boolean,
  selectedRuntime: Schema.optional(Schema.String),
  selectedModule: Schema.optional(Schema.String),
  selectedInstance: Schema.optional(Schema.String),
  selectedEventIndex: Schema.optional(Schema.Number),
  // 当前字段筛选路径：由 Graph 点击节点设置，用于在 Timeline 中按字段关联筛选事件。
  selectedFieldPath: Schema.optional(Schema.String),
  runtimes: Schema.Array(
    Schema.Struct({
      runtimeLabel: Schema.String,
      modules: Schema.Array(
        Schema.Struct({
          moduleId: Schema.String,
          count: Schema.Number,
          instances: Schema.Array(Schema.String),
        }),
      ),
    }),
  ),
  timeline: Schema.Array(TimelineEntrySchema),
  activeState: Schema.optional(Schema.Any),
  layout: Schema.Struct({
    height: Schema.Number,
    marginLeft: Schema.Number,
    marginRight: Schema.Number,
    isDragging: Schema.Boolean,
    trigger: Schema.optional(TriggerLayoutSchema),
  }),
  theme: Schema.Literal('system', 'light', 'dark'),
})

export type DevtoolsState = Schema.Schema.Type<typeof DevtoolsStateSchema>

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

const LAYOUT_STORAGE_KEY = '__logix_devtools_layout_v2__'

const loadLayoutFromStorage = (): DevtoolsState['layout'] | undefined => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return undefined
  }
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<DevtoolsState['layout']> | null
    if (!parsed || typeof parsed !== 'object') return undefined

    const { height, marginLeft, marginRight, trigger } = parsed as DevtoolsState['layout']
    if (typeof height !== 'number' || typeof marginLeft !== 'number' || typeof marginRight !== 'number') {
      return undefined
    }

    let normalizedTrigger: DevtoolsState['layout']['trigger']
    if (trigger && typeof trigger === 'object') {
      const maybeX = (trigger as any).x
      const maybeY = (trigger as any).y
      if (typeof maybeX === 'number' && typeof maybeY === 'number') {
        normalizedTrigger = {
          x: maybeX,
          y: maybeY,
          isDragging: false,
        }
      }
    }

    return {
      height,
      marginLeft,
      marginRight,
      // dragging 状态不持久化，刷新后一律视为未拖拽中。
      isDragging: false,
      trigger: normalizedTrigger,
    }
  } catch {
    return undefined
  }
}

const persistLayoutToStorage = (layout: DevtoolsState['layout']): void => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  try {
    const { height, marginLeft, marginRight, trigger } = layout
    const payload = {
      height,
      marginLeft,
      marginRight,
      trigger: trigger
        ? {
            x: trigger.x,
            y: trigger.y,
          }
        : undefined,
    }
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

interface DevtoolsSelectionOverride {
  readonly open?: boolean
  readonly selectedRuntime?: string
  readonly selectedModule?: string
  readonly selectedInstance?: string
  readonly selectedEventIndex?: number
  /**
   * 当用户从 StateTraitGraph 节点触发筛选时，记录当前选中的 fieldPath：
   * - Timeline 构建时可优先展示与该字段相关的事件；
   * - 清空时置为 undefined，恢复全量视图。
   */
  readonly selectedFieldPath?: string
  /**
   * 标记这次变更是否来自「用户主动点击某条事件」：
   * - true：Inspector 应优先展示该事件自身携带的 stateAfter；
   * - false / 未提供：在没有 stateAfter 时，可以回退到 latestStates 视角，表示“当前状态”。
   */
  readonly userSelectedEvent?: boolean
  readonly layout?: Partial<DevtoolsState['layout']>
  readonly theme?: DevtoolsState['theme']
}

const emptyDevtoolsState: DevtoolsState = {
  open: false,
  selectedRuntime: undefined,
  selectedModule: undefined,
  selectedInstance: undefined,
  selectedEventIndex: undefined,
  selectedFieldPath: undefined,
  runtimes: [],
  timeline: [],
  activeState: undefined,
  layout: loadLayoutFromStorage() ?? {
    height: 400,
    marginLeft: 16,
    marginRight: 16,
    isDragging: false,
    trigger: undefined,
  },
  theme: 'system',
}

const computeDevtoolsState = (
  prev: DevtoolsState | undefined,
  snapshot: DevtoolsSnapshot,
  overrides: DevtoolsSelectionOverride = {},
): DevtoolsState => {
  const base = prev ?? emptyDevtoolsState

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
    }[]
  }[] = []
  for (const runtimeLabel of runtimeOrder) {
    const byModule = activeInstances.get(runtimeLabel)
    if (!byModule || byModule.size === 0) continue

    const modules: { moduleId: string; count: number; instances: string[] }[] = []
    for (const [moduleId, ids] of byModule) {
      const instances = Array.from(ids).sort()
      modules.push({ moduleId, count: instances.length, instances })
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

      const modules: { moduleId: string; count: number; instances: string[] }[] = []
      for (const [moduleId, ids] of byModule) {
        const instances = Array.from(ids).sort()
        modules.push({ moduleId, count: instances.length, instances })
      }
      modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      runtimeViews.push({ runtimeLabel, modules })
    }
  }

  const runtimeLabels = runtimeViews.map((r) => r.runtimeLabel)

  // 2) 选择 Runtime / Module / Instance（带容错）
  const preferRuntime =
    overrides.selectedRuntime !== undefined ? overrides.selectedRuntime : base.selectedRuntime
  const selectedRuntime = preferRuntime && runtimeLabels.includes(preferRuntime) ? preferRuntime : runtimeLabels[0]

  const runtimeView = runtimeViews.find((r) => r.runtimeLabel === selectedRuntime)
  const modulesForRuntime = runtimeView?.modules ?? []

  const preferModule =
    overrides.selectedModule !== undefined ? overrides.selectedModule : base.selectedModule
  const selectedModule =
    modulesForRuntime.length === 0
      ? undefined
      : preferModule && modulesForRuntime.some((m) => m.moduleId === preferModule)
        ? preferModule
        : modulesForRuntime[0]?.moduleId

  const moduleView = modulesForRuntime.find((m) => m.moduleId === selectedModule)
  const instancesForModule = moduleView?.instances ?? []

  const preferInstance =
    overrides.selectedInstance !== undefined ? overrides.selectedInstance : base.selectedInstance
  const selectedInstance =
    instancesForModule.length === 0
      ? undefined
      : preferInstance && instancesForModule.includes(preferInstance)
        ? preferInstance
        : instancesForModule[0]

  // 注意：selectedEventIndex / selectedFieldPath 需要支持“显式清空”的语义，
  // 因此不能简单用 `!== undefined` 作为是否提供 override 的判断条件。
  const hasSelectedEventIndexOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    'selectedEventIndex',
  )
  const preferEventIndex = hasSelectedEventIndexOverride
    ? overrides.selectedEventIndex
    : base.selectedEventIndex

  const hasSelectedFieldPathOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    'selectedFieldPath',
  )
  const selectedFieldPath = hasSelectedFieldPathOverride
    ? overrides.selectedFieldPath
    : (base as any).selectedFieldPath

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

  const slicedTimeline = timeline.length > 50 ? timeline.slice(timeline.length - 50) : timeline

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

  return {
    open,
    selectedRuntime,
    selectedModule,
    selectedInstance,
    selectedEventIndex,
    selectedFieldPath,
    runtimes: runtimeViews as DevtoolsState['runtimes'],
    timeline: slicedTimeline,
    activeState,
    layout,
    theme,
  }
}

const ResizePayload = Schema.Struct({
  edge: Schema.Literal('top', 'left', 'right'),
})

const UpdateLayoutPayload = Schema.partial(
  Schema.Struct({
    height: Schema.Number,
    marginLeft: Schema.Number,
    marginRight: Schema.Number,
    isDragging: Schema.Boolean,
    trigger: Schema.optional(
      Schema.Struct({
        x: Schema.Number,
        y: Schema.Number,
        isDragging: Schema.Boolean,
      }),
    ),
  }),
)

const DevtoolsModule = Logix.Module.make('LogixDevtoolsModule', {
  state: DevtoolsStateSchema,
  actions: {
    toggleOpen: Schema.Void,
    selectRuntime: Schema.String,
    selectModule: Schema.String,
    selectInstance: Schema.String,
    selectEventIndex: Schema.Number,
    selectFieldPath: Schema.String,
    clearEvents: Schema.Void,
    resizeStart: ResizePayload,
    updateLayout: UpdateLayoutPayload,
    setTheme: Schema.Literal('system', 'light', 'dark'),
  },
  reducers: {
    toggleOpen: (state) => {
      const nextOpen = !state.open
      return computeDevtoolsState(state, getDevtoolsSnapshot(), {
        open: nextOpen,
        userSelectedEvent: false,
      })
    },
    selectRuntime: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedRuntime: (action as any).payload,
        selectedModule: undefined,
        selectedInstance: undefined,
        selectedEventIndex: undefined,
        userSelectedEvent: false,
      }),
    selectModule: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedModule: (action as any).payload,
        selectedInstance: undefined,
        selectedEventIndex: undefined,
        userSelectedEvent: false,
      }),
    selectInstance: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedInstance: (action as any).payload,
        selectedEventIndex: undefined,
        userSelectedEvent: false,
      }),
    selectFieldPath: (state, action) => {
      const nextFieldPath = (action as any).payload as string
      const isToggleOff = state.selectedFieldPath === nextFieldPath

      if (isToggleOff) {
        // 再次点击当前选中的字段节点：取消字段筛选，恢复完整 Timeline + 最新状态视图。
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedFieldPath: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      }

      return computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedFieldPath: nextFieldPath,
        // 切换字段筛选时重置事件选择，让 Timeline 使用该字段的最新一条相关事件。
        selectedEventIndex: undefined,
        userSelectedEvent: false,
      })
    },
    selectEventIndex: (state, action) => {
      const nextIndex = (action as any).payload as number
      const isToggleOff = state.selectedEventIndex === nextIndex

      if (isToggleOff) {
        // 再次点击当前选中的事件：取消选中，回退到“仅看最新状态”的视图。
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      }

      return computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedEventIndex: nextIndex,
        userSelectedEvent: true,
      })
    },
    updateLayout: (state, action) => {
      const partial = (action as any).payload as Partial<DevtoolsState['layout']>
      const layout = { ...state.layout, ...partial }
      const next: DevtoolsState = {
        ...state,
        layout,
      }
      if (!next.layout.isDragging && next.layout.trigger?.isDragging !== true) {
        persistLayoutToStorage(next.layout)
      }
      return next
    },
    setTheme: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        theme: (action as any).payload,
        userSelectedEvent: false,
      }),
  },
})

// Helper to create a stream from DOM events
const fromDomEvent = <K extends keyof WindowEventMap>(event: K): Stream.Stream<WindowEventMap[K]> =>
  Stream.async<WindowEventMap[K]>((emit) => {
    const handler = (e: WindowEventMap[K]) => emit.single(e)
    window.addEventListener(event, handler)
    return Effect.sync(() => window.removeEventListener(event, handler))
  })

const DevtoolsLogic = DevtoolsModule.logic(($) => ({
  // setup 段暂不做任何工作，所有初始化与 watcher 注册均放在 run 段，
  // 避免触发「setup 阶段禁止使用 Lifecycle / Flow API」的约束。
  setup: Effect.void,

  // run 段：初始化 snapshot 订阅 + 注册所有 onAction watcher 与拖拽逻辑。
  run: Effect.gen(function* () {
    const runtime = yield* Effect.runtime<any>()

    const recomputeFromSnapshot = () =>
      EffectRuntime.runFork(runtime)(
        $.state.update((prev) =>
          computeDevtoolsState(prev as DevtoolsState | undefined, getDevtoolsSnapshot(), {
            userSelectedEvent: false,
          }),
        ) as Effect.Effect<void, never, any>,
      )

    // 初始化：同步一次当前 snapshot + 注册监听
    yield* $.lifecycle.onInit(
      Effect.sync(() => {
        recomputeFromSnapshot()
        subscribeDevtoolsSnapshot(recomputeFromSnapshot)
      }),
    )

    // 拖拽逻辑
    yield* $.onAction('resizeStart').runFork((action) =>
      Effect.gen(function* () {
        const edge = action.payload.edge

        // Signal dragging started：仅更新 layout.isDragging，不重新计算 Snapshot 衍生视图。
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

        // Finished dragging：仅落盘 layout 结果。
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

    // 行为逻辑：仅保留具有副作用的 clearEvents，纯状态更新通过 Primary Reducer 处理。
    yield* $.onAction('clearEvents').runFork(() =>
      Effect.sync(() => {
        clearDevtoolsEvents()
      }),
    )
  }),
}))

const DevtoolsImpl = DevtoolsModule.implement({
  initial: emptyDevtoolsState,
  logics: [DevtoolsLogic],
})

const devtoolsRuntime = Logix.Runtime.make(DevtoolsImpl)

const devtoolsModuleRuntime = devtoolsRuntime.runSync(
  DevtoolsModule as unknown as Effect.Effect<Logix.ModuleRuntime<DevtoolsState, any>, never, any>,
)

export { devtoolsRuntime, devtoolsModuleRuntime }
