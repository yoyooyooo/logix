import { Config, Data, Effect, Schema, SubscriptionRef, Duration } from 'effect'
import { Store, Logic } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：审批场景的 State / Action
// ---------------------------------------------------------------------------

const ApprovalDecisionSchema = Schema.Union(Schema.Literal('APPROVE'), Schema.Literal('REJECT'))

const ApprovalStateSchema = Schema.Struct({
  taskId: Schema.String,
  comment: Schema.String,
  decision: ApprovalDecisionSchema,
  status: Schema.Literal('idle', 'submitting', 'done', 'error'),
  errorMessage: Schema.optional(Schema.String),
})

const ApprovalActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('submit') }),
  Schema.Struct({ _tag: Schema.Literal('reset') }),
)

export type ApprovalShape = Store.Shape<typeof ApprovalStateSchema, typeof ApprovalActionSchema>
export type ApprovalState = Store.StateOf<ApprovalShape>
export type ApprovalAction = Store.ActionOf<ApprovalShape>

// ---------------------------------------------------------------------------
// 错误建模：Tagged Error（领域错误）
// ---------------------------------------------------------------------------

export class ApprovalServiceError extends Data.TaggedError('ApprovalServiceError')<{
  readonly taskId: string
  readonly reason: string
}> {}

// ---------------------------------------------------------------------------
// Service：对齐 EffectPatterns 的 Effect.Service + Config 模式
// ---------------------------------------------------------------------------

export class ApprovalService extends Effect.Service<ApprovalService>()('ApprovalService', {
  effect: Effect.gen(function* () {
    // 从 Config 中读取行为配置
    const failOnReject = yield* Config.boolean('APPROVAL_FAIL_ON_REJECT').pipe(Config.withDefault(false))
    const logPrefix = yield* Config.string('APPROVAL_LOG_PREFIX').pipe(
      Config.withDefault('[Approval]'),
    )
    const simulatedDelayMs = yield* Config.number('APPROVAL_SIMULATED_DELAY_MS').pipe(
      Config.withDefault(200),
    )

    const log = (message: string) => Effect.logInfo(`${logPrefix} ${message}`)

    const decide = (input: { taskId: string; comment?: string; decision: 'APPROVE' | 'REJECT' }) =>
      Effect.gen(function* () {
        if (failOnReject && input.decision === 'REJECT') {
          return yield* Effect.fail(
            new ApprovalServiceError({
              taskId: input.taskId,
              reason: 'Reject is disabled by configuration',
            }),
          )
        }

        yield* log(
          `decide taskId=${input.taskId} decision=${input.decision} comment=${input.comment ?? ''}`,
        )
        yield* Effect.sleep(Duration.millis(simulatedDelayMs))
      })

    const recordAudit = (input: {
      taskId: string
      decision: 'APPROVE' | 'REJECT'
      comment?: string
    }) =>
      log(
        `audit taskId=${input.taskId} decision=${input.decision} comment=${input.comment ?? ''}`,
      )

    const refreshTasks = () => log('refresh task list')

    return {
      decide,
      recordAudit,
      refreshTasks,
      log,
    }
  }),
}) {}

// ---------------------------------------------------------------------------
// 长逻辑封装：封装「审批决策 + 审计 + 刷新列表」的 Effect
// ---------------------------------------------------------------------------

export interface ApprovalEffectInput {
  stateRef: SubscriptionRef.SubscriptionRef<ApprovalState>
}

export const runApprovalFlowEffect = (input: ApprovalEffectInput) =>
  Effect.gen(function* (_) {
    const api = yield* ApprovalService
    const state = yield* SubscriptionRef.get(input.stateRef)

    const { taskId, comment, decision } = state

    yield* api.log(`approvalFlow.start taskId=${taskId} decision=${decision}`)

    // 业务决策
    yield* api.decide({ taskId, comment, decision })

    // 审计记录
    yield* api.recordAudit({ taskId, decision, comment })

    // 刷新任务列表
    yield* api.refreshTasks()

    yield* api.log(`approvalFlow.done taskId=${taskId} decision=${decision}`)
  })

// ---------------------------------------------------------------------------
// Logic：响应提交 / 重置 Action，触发长逻辑 Effect
// ---------------------------------------------------------------------------

const $ = Logic.forShape<ApprovalShape, ApprovalService>()

export const ApprovalLogic: Logic.Fx<ApprovalShape, ApprovalService, void, ApprovalServiceError | never> =
  Logic.make<ApprovalShape, ApprovalService>(
    Effect.gen(function* () {
      const submit$ = $.flow.fromAction((a): a is { _tag: 'submit' } => a._tag === 'submit')
      const reset$ = $.flow.fromAction((a): a is { _tag: 'reset' } => a._tag === 'reset')

      // 借用整棵审批状态作为 Ref，交给封装好的长逻辑内部读取
      const stateRef = $.state.ref()

      // 启动审批流：如果已有任务在提交中，runExhaust 会丢弃后续触发，防止重复提交
      const startApproval = Effect.gen(function* () {
        yield* $.state.update((prev) => ({
          ...prev,
          status: 'submitting',
          errorMessage: undefined,
        }))

        // 执行业务长逻辑，并显式处理 ApprovalServiceError
        yield* $.control.tryCatch({
          try: runApprovalFlowEffect({ stateRef }),
          catch: (err: ApprovalServiceError) =>
            $.state.update((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: err.reason,
            })),
        })

        // 若仍处于 submitting，说明没有错误，标记为 done
        const latest = yield* $.state.read
        if (latest.status === 'submitting') {
          yield* $.state.update((prev) => ({
            ...prev,
            status: 'done',
          }))
        }
      })

      const resetEffect = $.state.update((prev) => ({
        ...prev,
        status: 'idle',
        errorMessage: undefined,
        comment: '',
      }))

      yield* Effect.all([
        submit$.pipe($.flow.runExhaust(startApproval)),
        reset$.pipe($.flow.run(resetEffect)),
      ])
    }) as Logic.Fx<ApprovalShape, ApprovalService, void, ApprovalServiceError | never>,
  )

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic 成为一棵 Store
// ---------------------------------------------------------------------------

const ApprovalStateLayer = Store.State.make(ApprovalStateSchema, {
  taskId: '',
  comment: '',
  decision: 'APPROVE',
  status: 'idle',
})

const ApprovalActionLayer = Store.Actions.make(ApprovalActionSchema)

export const ApprovalStore = Store.make<ApprovalShape>(ApprovalStateLayer, ApprovalActionLayer, ApprovalLogic)
