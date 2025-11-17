import { Schema } from 'effect'

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
  traitConverge: Schema.optional(
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
          kind: Schema.Literal('computed', 'link'),
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
  mode: Schema.Literal('basic', 'deep'),
  showTraitEvents: Schema.Boolean,
  showReactRenderEvents: Schema.Boolean,
  enableTimeTravelUI: Schema.Boolean,
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
  // Selected field filter path: set by Graph node click; used to correlate/filter events in the Timeline by field.
  selectedFieldPath: Schema.optional(Schema.String),
  // Timeline filter range (inclusive index interval [start, end]),
  // set by views like OverviewStrip to focus a time window in high-noise scenarios.
  timelineRange: Schema.optional(
    Schema.Struct({
      start: Schema.Number,
      end: Schema.Number,
    }),
  ),
  // Whether the current instance is in time-travel mode:
  // - Only set by Devtools controls when enableTimeTravelUI = true.
  // - mode = "before"|"after" indicates which side of the transaction to view.
  timeTravel: Schema.optional(
    Schema.Struct({
      moduleId: Schema.String,
      instanceId: Schema.String,
      txnId: Schema.String,
      mode: Schema.Literal('before', 'after'),
    }),
  ),
  runtimes: Schema.Array(
    Schema.Struct({
      runtimeLabel: Schema.String,
      modules: Schema.Array(
        Schema.Struct({
          moduleId: Schema.String,
          count: Schema.Number,
          instances: Schema.Array(Schema.String),
          // Whether a StateTraitProgram exists (blueprint layer):
          hasTraitBlueprint: Schema.Boolean,
          // Whether there is at least one runtime instance with a TraitProgram:
          hasTraitRuntime: Schema.Boolean,
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
  theme: Schema.Literal('system', 'light', 'dark'),
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
   * When the user triggers filtering from a StateTraitGraph node, record the selected fieldPath:
   * - Timeline building can prioritize events related to this field.
   * - When cleared, set to undefined to restore the full view.
   */
  readonly selectedFieldPath?: string
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
  mode: 'deep',
  showTraitEvents: true,
  showReactRenderEvents: true,
  enableTimeTravelUI: true,
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
  timelineRange: undefined,
  timeTravel: undefined,
  runtimes: [],
  timeline: [],
  operationSummary: undefined,
  activeState: undefined,
  layout: defaultLayout,
  theme: 'system',
  settings: defaultSettings,
}
