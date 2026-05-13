import { Schema } from 'effect'
import { emptyWorkbenchHostViewModel, type WorkbenchDrilldownSelector, type WorkbenchHostViewModel } from './workbench/index.js'

export const TimelineEntrySchema = Schema.Struct({
  event: Schema.Any,
  stateAfter: Schema.optional(Schema.Any),
})
export type TimelineEntry = Schema.Schema.Type<typeof TimelineEntrySchema>

export const OperationSummarySchema = Schema.Struct({
  startedAt: Schema.Number,
  endedAt: Schema.Number,
  durationMs: Schema.Number,
  eventCount: Schema.Number,
  renderCount: Schema.Number,
  txnCount: Schema.Number,
  fieldConverge: Schema.optional(
    Schema.Struct({
      txnCount: Schema.Number,
      outcomes: Schema.Struct({
        Converged: Schema.Number,
        Noop: Schema.Number,
        Degraded: Schema.Number,
      }),
      degradedReasons: Schema.Struct({
        budget_exceeded: Schema.Number,
        runtime_error: Schema.Number,
      }),
      budgetMs: Schema.optional(Schema.Number),
      totalDurationMs: Schema.Number,
      executedSteps: Schema.Number,
      changedSteps: Schema.Number,
      top3: Schema.Array(
        Schema.Struct({
          stepId: Schema.String,
          kind: Schema.Literals(['computed', 'link']),
          fieldPath: Schema.String,
          durationMs: Schema.Number,
          changed: Schema.Boolean,
          txnId: Schema.optional(Schema.String),
        }),
      ),
    }),
  ),
})
export type OperationSummary = Schema.Schema.Type<typeof OperationSummarySchema>

export const TriggerLayoutSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  isDragging: Schema.Boolean,
})

export const DevtoolsSettingsSchema = Schema.Struct({
  showFieldEvents: Schema.Boolean,
  showReactRenderEvents: Schema.Boolean,
  operationWindowMs: Schema.Number,
  overviewThresholds: Schema.Struct({
    txnPerSecondWarn: Schema.Number,
    txnPerSecondDanger: Schema.Number,
    renderPerTxnWarn: Schema.Number,
    renderPerTxnDanger: Schema.Number,
  }),
  overviewHighlightDurationMs: Schema.Number,
  eventBufferSize: Schema.Number,
  sampling: Schema.Struct({
    reactRenderSampleRate: Schema.Number,
  }),
})

export type DevtoolsSettings = Schema.Schema.Type<typeof DevtoolsSettingsSchema>

export const DevtoolsStateSchema = Schema.Struct({
  open: Schema.Boolean,
  selectedRuntime: Schema.optional(Schema.String),
  selectedModule: Schema.optional(Schema.String),
  selectedInstance: Schema.optional(Schema.String),
  selectedEventIndex: Schema.optional(Schema.Number),
  selectedFieldPath: Schema.optional(Schema.String),
  selectedScopeId: Schema.optional(Schema.String),
  selectedSessionId: Schema.optional(Schema.String),
  selectedFindingId: Schema.optional(Schema.String),
  selectedArtifactKey: Schema.optional(Schema.String),
  selectedDrilldown: Schema.optional(Schema.Any),
  workbench: Schema.Any,
  runtimes: Schema.Array(
    Schema.Struct({
      runtimeLabel: Schema.String,
      modules: Schema.Array(
        Schema.Struct({
          moduleId: Schema.String,
          count: Schema.Number,
          instances: Schema.Array(Schema.String),
          // Whether a FieldProgram exists (blueprint layer):
          hasFieldBlueprint: Schema.Boolean,
          // Whether there is at least one runtime instance with a TraitProgram:
          hasFieldRuntime: Schema.Boolean,
        }),
      ),
    }),
  ),
  timeline: Schema.Array(TimelineEntrySchema),
  operationSummary: Schema.optional(OperationSummarySchema),
  activeState: Schema.optional(Schema.Any),
  layout: Schema.Struct({
    height: Schema.Number,
    marginLeft: Schema.Number,
    marginRight: Schema.Number,
    isDragging: Schema.Boolean,
    trigger: Schema.optional(TriggerLayoutSchema),
  }),
  theme: Schema.Literals(['system', 'light', 'dark']),
  settings: DevtoolsSettingsSchema,
})

export type DevtoolsState = Schema.Schema.Type<typeof DevtoolsStateSchema>

export interface DevtoolsSelectionOverride {
  readonly open?: boolean
  readonly selectedRuntime?: string
  readonly selectedModule?: string
  readonly selectedInstance?: string
  readonly selectedEventIndex?: number
  /**
   * When the user triggers filtering from a FieldGraph node, record the selected fieldPath:
   * - Timeline building can prioritize events related to this field.
   * - When cleared, set to undefined to restore the full view.
   */
  readonly selectedFieldPath?: string
  readonly selectedScopeId?: string
  readonly selectedSessionId?: string
  readonly selectedFindingId?: string
  readonly selectedArtifactKey?: string
  readonly selectedDrilldown?: WorkbenchDrilldownSelector
  /**
   * Marks whether this change comes from "user explicitly clicked an event":
   * - true: Inspector should prefer the event's own stateAfter.
   * - false / omitted: when stateAfter is missing, we may fall back to latestStates as "current state".
   */
  readonly userSelectedEvent?: boolean
  readonly layout?: Partial<DevtoolsState['layout']>
  readonly theme?: DevtoolsState['theme']
}

export const defaultSettings: DevtoolsSettings = {
  showFieldEvents: true,
  showReactRenderEvents: true,
  operationWindowMs: 1000,
  overviewThresholds: {
    txnPerSecondWarn: 50,
    txnPerSecondDanger: 150,
    renderPerTxnWarn: 3,
    renderPerTxnDanger: 6,
  },
  overviewHighlightDurationMs: 3000,
  eventBufferSize: 500,
  sampling: {
    reactRenderSampleRate: 1,
  },
}

export const defaultLayout: DevtoolsState['layout'] = {
  height: 400,
  marginLeft: 16,
  marginRight: 16,
  isDragging: false,
  trigger: undefined,
}

export const emptyDevtoolsState: DevtoolsState = {
  open: false,
  selectedRuntime: undefined,
  selectedModule: undefined,
  selectedInstance: undefined,
  selectedEventIndex: undefined,
  selectedFieldPath: undefined,
  selectedScopeId: undefined,
  selectedSessionId: undefined,
  selectedFindingId: undefined,
  selectedArtifactKey: undefined,
  selectedDrilldown: undefined,
  workbench: emptyWorkbenchHostViewModel as WorkbenchHostViewModel,
  runtimes: [],
  timeline: [],
  operationSummary: undefined,
  activeState: undefined,
  layout: defaultLayout,
  theme: 'system',
  settings: defaultSettings,
}
