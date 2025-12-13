import * as Logix from '@logix/core'
import { Schema } from 'effect'
import { getDevtoolsSnapshot } from '../snapshot.js'
import { computeDevtoolsState } from './compute.js'
import { DevtoolsStateSchema, type DevtoolsSettings, type DevtoolsState } from './model.js'
import {
  clampEventBufferSize,
  clampOperationWindowMs,
  clampOverviewHighlightDurationMs,
  persistLayoutToStorage,
  persistSettingsToStorage,
} from './storage.js'

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

export const DevtoolsModule = Logix.Module.make('LogixDevtoolsModule', {
  state: DevtoolsStateSchema,
  actions: {
    toggleOpen: Schema.Void,
    selectRuntime: Schema.String,
    selectModule: Schema.String,
    selectInstance: Schema.String,
    selectEventIndex: Schema.Number,
    selectFieldPath: Schema.String,
    setTimelineRange: Schema.Struct({
      start: Schema.Number,
      end: Schema.Number,
    }),
    clearTimelineRange: Schema.Void,
    timeTravelBefore: Schema.Struct({
      moduleId: Schema.String,
      instanceId: Schema.String,
      txnId: Schema.String,
    }),
    timeTravelAfter: Schema.Struct({
      moduleId: Schema.String,
      instanceId: Schema.String,
      txnId: Schema.String,
    }),
    timeTravelLatest: Schema.Struct({
      moduleId: Schema.String,
      instanceId: Schema.String,
    }),
    clearEvents: Schema.Void,
    resizeStart: ResizePayload,
    updateLayout: UpdateLayoutPayload,
    setTheme: Schema.Literal('system', 'light', 'dark'),
    setMode: Schema.Literal('basic', 'deep'),
    updateSettings: Schema.Any,
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
      (() => {
        const next = computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedRuntime: (action as any).payload,
          selectedModule: undefined,
          selectedInstance: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
        return {
          ...next,
          timeTravel: undefined,
        }
      })(),
    selectModule: (state, action) =>
      (() => {
        const next = computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedModule: (action as any).payload,
          selectedInstance: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
        return {
          ...next,
          timeTravel: undefined,
        }
      })(),
    selectInstance: (state, action) =>
      (() => {
        const next = computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedInstance: (action as any).payload,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
        return {
          ...next,
          timeTravel: undefined,
        }
      })(),
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
    setTimelineRange: (state, action) => {
      const payload = (action as any).payload as { start: number; end: number }
      const start = Math.max(0, Math.floor(payload.start))
      const end = Math.max(start, Math.floor(payload.end))
      const next: DevtoolsState = {
        ...state,
        timelineRange: {
          start,
          end,
        },
      }
      return next
    },
    clearTimelineRange: (state) => {
      const next: DevtoolsState = {
        ...state,
        timelineRange: undefined,
      }
      return next
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
    setMode: (state, action) => {
      const current = state as DevtoolsState
      const nextMode = (action as any).payload as DevtoolsSettings['mode']
      if (current.settings.mode === nextMode) {
        return current
      }

      const nextSettings: DevtoolsSettings = {
        ...current.settings,
        mode: nextMode,
        // basic 模式默认隐藏 Trait/渲染事件；deep 模式展开全部。
        showTraitEvents: nextMode === 'deep',
        showReactRenderEvents: nextMode === 'deep',
      }

      const next: DevtoolsState = {
        ...current,
        settings: nextSettings,
      }

      persistSettingsToStorage(nextSettings)
      return next
    },
    updateSettings: (state, action) => {
      const current = state as DevtoolsState
      const partial = ((action as any).payload ?? {}) as Partial<DevtoolsSettings>

      let nextSettings: DevtoolsSettings = {
        ...current.settings,
        ...partial,
        overviewThresholds: {
          ...current.settings.overviewThresholds,
          ...(partial.overviewThresholds ?? {}),
        },
        sampling: {
          ...current.settings.sampling,
          ...(partial.sampling ?? {}),
        },
      }

      // mode 切换时，若未显式提供 show* 字段，则按 basic/deep 默认策略回填。
      if (partial.mode && partial.mode !== current.settings.mode) {
        if (partial.showTraitEvents === undefined) {
          nextSettings = {
            ...nextSettings,
            showTraitEvents: partial.mode === 'deep',
          }
        }
        if (partial.showReactRenderEvents === undefined) {
          nextSettings = {
            ...nextSettings,
            showReactRenderEvents: partial.mode === 'deep',
          }
        }
      }

      nextSettings = {
        ...nextSettings,
        eventBufferSize: clampEventBufferSize(nextSettings.eventBufferSize),
        operationWindowMs: clampOperationWindowMs(nextSettings.operationWindowMs),
        overviewHighlightDurationMs: clampOverviewHighlightDurationMs(nextSettings.overviewHighlightDurationMs),
        sampling: {
          reactRenderSampleRate: Math.max(0, Math.min(1, Number(nextSettings.sampling.reactRenderSampleRate ?? 1))),
        },
      }

      const next: DevtoolsState = {
        ...current,
        settings: nextSettings,
      }

      persistSettingsToStorage(nextSettings)
      return next
    },
    timeTravelBefore: (state, action) => {
      const current = state as DevtoolsState
      const payload = (action as any).payload as {
        moduleId: string
        instanceId: string
        txnId: string
      }
      const next: DevtoolsState = {
        ...current,
        timeTravel: {
          moduleId: payload.moduleId,
          instanceId: payload.instanceId,
          txnId: payload.txnId,
          mode: 'before',
        },
      }
      return next
    },
    timeTravelAfter: (state, action) => {
      const current = state as DevtoolsState
      const payload = (action as any).payload as {
        moduleId: string
        instanceId: string
        txnId: string
      }
      const next: DevtoolsState = {
        ...current,
        timeTravel: {
          moduleId: payload.moduleId,
          instanceId: payload.instanceId,
          txnId: payload.txnId,
          mode: 'after',
        },
      }
      return next
    },
    timeTravelLatest: (state, action) => {
      const current = state as DevtoolsState
      const _payload = (action as any).payload as {
        moduleId: string
        instanceId: string
      }
      // 回到最新状态：仅清除 timeTravel 标记，由 Logic 通过 Runtime.applyTransactionSnapshot 负责具体回放。
      const next: DevtoolsState = {
        ...current,
        timeTravel: undefined,
      }
      return next
    },
  },
})

