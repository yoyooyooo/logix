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
  // 当前字段筛选路径：由 Graph 点击节点设置，用于在 Timeline 中按字段关联筛选事件。
  selectedFieldPath: Schema.optional(Schema.String),
  // 当前时间线过滤范围（基于时间线索引的闭区间 [start, end]），
  // 由 OverviewStrip 等视图设置，用于在高噪音场景下聚焦某一时间窗口。
  timelineRange: Schema.optional(
    Schema.Struct({
      start: Schema.Number,
      end: Schema.Number,
    }),
  ),
  // 当前实例是否处于时间旅行模式：
  // - 仅在 enableTimeTravelUI = true 时由 Devtools 操作区设置；
  // - mode = "before"|"after" 表示基于哪个事务的前/后状态。
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
          // 是否存在 StateTraitProgram（蓝图层）：
          hasTraitBlueprint: Schema.Boolean,
          // 是否存在至少一个带 TraitProgram 的运行实例：
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
