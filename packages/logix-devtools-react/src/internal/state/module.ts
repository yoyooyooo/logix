import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { getDevtoolsSnapshot } from '../snapshot/index.js'
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
  edge: Schema.Literals(['top', 'left', 'right']),
})

const UpdateLayoutPayload = Schema.Struct({
  height: Schema.optional(Schema.Number),
  marginLeft: Schema.optional(Schema.Number),
  marginRight: Schema.optional(Schema.Number),
  isDragging: Schema.optional(Schema.Boolean),
  trigger: Schema.optional(
    Schema.Struct({
      x: Schema.Number,
      y: Schema.Number,
      isDragging: Schema.Boolean,
    }),
  ),
})

export const DevtoolsModule = Logix.Module.make('LogixDevtoolsModule', {
  state: DevtoolsStateSchema,
  actions: {
    toggleOpen: Schema.Void,
    selectRuntime: Schema.String,
    selectModule: Schema.String,
    selectInstance: Schema.String,
    selectEventIndex: Schema.Number,
    selectFieldPath: Schema.String,
    selectScope: Schema.String,
    selectSession: Schema.String,
    selectFinding: Schema.String,
    selectArtifact: Schema.String,
    selectDrilldown: Schema.Any,
    clearEvents: Schema.Void,
    importEvidenceJson: Schema.String,
    clearImportedEvidence: Schema.Void,
    resizeStart: ResizePayload,
    updateLayout: UpdateLayoutPayload,
    setTheme: Schema.Literals(['system', 'light', 'dark']),
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
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedRuntime: (action as any).payload,
          selectedModule: undefined,
          selectedInstance: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      })(),
    selectModule: (state, action) =>
      (() => {
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedModule: (action as any).payload,
          selectedInstance: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      })(),
    selectInstance: (state, action) =>
      (() => {
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedInstance: (action as any).payload,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      })(),
    selectFieldPath: (state, action) => {
      const nextFieldPath = (action as any).payload as string
      const isToggleOff = state.selectedFieldPath === nextFieldPath

      if (isToggleOff) {
        // Click the currently selected field node again to clear the field filter and restore full timeline + latest view.
        return computeDevtoolsState(state, getDevtoolsSnapshot(), {
          selectedFieldPath: undefined,
          selectedEventIndex: undefined,
          userSelectedEvent: false,
        })
      }

      return computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedFieldPath: nextFieldPath,
        // When switching field filters, reset the event selection so the timeline uses the latest event for that field.
        selectedEventIndex: undefined,
        userSelectedEvent: false,
      })
    },
    selectEventIndex: (state, action) => {
      const nextIndex = (action as any).payload as number
      const isToggleOff = state.selectedEventIndex === nextIndex

      if (isToggleOff) {
        // Click the currently selected event again to clear selection and fall back to the "latest state only" view.
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
    selectScope: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedScopeId: (action as any).payload,
        selectedSessionId: undefined,
        selectedFindingId: undefined,
        selectedArtifactKey: undefined,
        userSelectedEvent: false,
      }),
    selectSession: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedSessionId: (action as any).payload,
        selectedFindingId: undefined,
        selectedArtifactKey: undefined,
        userSelectedEvent: false,
      }),
    selectFinding: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedFindingId: (action as any).payload,
        selectedArtifactKey: undefined,
        userSelectedEvent: false,
      }),
    selectArtifact: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedArtifactKey: (action as any).payload,
        userSelectedEvent: false,
      }),
    selectDrilldown: (state, action) =>
      computeDevtoolsState(state, getDevtoolsSnapshot(), {
        selectedDrilldown: (action as any).payload,
        userSelectedEvent: false,
      }),
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
  },
})
