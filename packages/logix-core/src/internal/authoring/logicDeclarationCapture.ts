import { Effect, Stream } from 'effect'
import * as BoundApiRuntime from '../runtime/core/BoundApiRuntime.js'
import * as LogicDiagnostics from '../runtime/core/LogicDiagnostics.js'
import { PublicLogicAuthoringShapeError } from './logicSurface.js'
import type * as ModuleFields from '../runtime/core/ModuleFields.js'
import type { RuntimeInternals } from '../runtime/core/RuntimeInternals.js'
import { setRuntimeInternals } from '../runtime/core/runtimeInternalsAccessor.js'
import type {
  ActionOf,
  AnyModuleShape,
  BoundApi,
  LogicPlan,
  ModuleLogic,
  ModuleRuntime,
  StateOf,
} from '../runtime/core/module.js'

export type LogicDeclarationCapture = {
  readonly fields: ReadonlyArray<ModuleFields.FieldSpec>
}

const LOGIC_DECLARATION_CAPTURE = Symbol.for('@logixjs/core/logicDeclarationCapture')

const isLogicDescriptor = <Sh extends AnyModuleShape, R = never, E = unknown>(
  value: unknown,
): value is LogicPlan<Sh, R, E> =>
  Boolean(value) &&
  typeof value === 'object' &&
  (Object.prototype.hasOwnProperty.call(value, 'declare') || Object.prototype.hasOwnProperty.call(value, 'setup')) &&
  Object.prototype.hasOwnProperty.call(value, 'run')

const makeCaptureRuntime = <Sh extends AnyModuleShape>(
  moduleId: string,
): ModuleRuntime<StateOf<Sh>, ActionOf<Sh>> => ({
  moduleId,
  instanceId: `${moduleId}::declaration-capture`,
  getState: Effect.succeed(undefined as StateOf<Sh>),
  setState: () => Effect.void,
  dispatch: () => Effect.void,
  dispatchBatch: () => Effect.void,
  dispatchLowPriority: () => Effect.void,
  actions$: Stream.empty as any,
  actionsByTag$: () => Stream.empty as any,
  actionsWithMeta$: Stream.empty as any,
  changes: () => Stream.empty as any,
  changesWithMeta: () => Stream.empty as any,
  changesReadQueryWithMeta: () => Stream.empty as any,
  ref: () => ({
    get: Effect.succeed(undefined as any),
    changes: Stream.empty as any,
  }),
}) satisfies ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>

const makeCaptureInternals = (
  moduleId: string,
  instanceId: string,
  capturedFields: Array<ModuleFields.FieldSpec>,
): RuntimeInternals => ({
  moduleId,
  instanceId,
  lifecycle: {
    registerInitRequired: () => void 0,
    registerStart: () => void 0,
    registerDestroy: () => void 0,
    registerOnError: () => void 0,
    registerPlatformSuspend: () => void 0,
    registerPlatformResume: () => void 0,
    registerPlatformReset: () => void 0,
  },
  imports: {
    kind: 'imports-scope',
    get: () => undefined,
  },
  txn: {
    instrumentation: {} as any,
    registerReducer: () => void 0,
    registerActionStateWriteback: () => void 0,
    dispatchWithOriginOverride: () => Effect.void,
    dispatchLowPriorityWithOriginOverride: () => Effect.void,
    dispatchBatchWithOriginOverride: () => Effect.void,
    runWithStateTransaction: (_origin, body) => body(),
    updateDraft: () => void 0,
    recordStatePatch: () => void 0,
    recordReplayEvent: () => void 0,
    applyTransactionSnapshot: () => Effect.void,
  },
  concurrency: {
    resolveConcurrencyPolicy: () =>
      Effect.succeed({
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 1024,
        allowUnbounded: false,
        pressureWarningThreshold: {
          backlogCount: 1024,
          backlogDurationMs: 1000,
        },
        warningCooldownMs: 1000,
        configScope: 'builtin',
        concurrencyLimitScope: 'builtin',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'builtin',
        allowUnboundedScope: 'builtin',
      }),
  },
  txnLanes: {
    resolveTxnLanePolicy: () => Effect.succeed({} as any),
  },
  fields: {
    rowIdStore: {},
    getListConfigs: () => [],
    registerSourceRefresh: () => void 0,
    forkSourceRefresh: () => Effect.void,
    getSourceRefreshHandler: () => undefined,
    registerFieldProgram: () => void 0,
    enqueueFieldValidateRequest: () => void 0,
    getModuleFieldsSnapshot: () => undefined,
    setModuleFieldsSnapshot: () => void 0,
  },
  effects: {
    registerEffect: () =>
      Effect.succeed({
        sourceKey: 'declaration-capture',
        duplicate: false,
      }),
  },
  devtools: {
    registerConvergeStaticIr: () => void 0,
  },
})

export const attachLogicDeclarationCapture = <L extends object>(logic: L, capture: LogicDeclarationCapture): L => {
  try {
    Object.defineProperty(logic, LOGIC_DECLARATION_CAPTURE, {
      value: capture,
      enumerable: false,
      configurable: true,
    })
  } catch {
    // best-effort
  }
  return logic
}

export const getLogicDeclarationCapture = (logic: unknown): LogicDeclarationCapture | undefined => {
  if (!logic || (typeof logic !== 'object' && typeof logic !== 'function')) {
    return undefined
  }
  return (logic as any)[LOGIC_DECLARATION_CAPTURE] as LogicDeclarationCapture | undefined
}

export const captureLogicDeclarations = <Sh extends AnyModuleShape, R = never, E = unknown>(args: {
  readonly shape: Sh
  readonly moduleId: string
  readonly build: (api: BoundApi<Sh, R>) => ModuleLogic<Sh, R, E>
}): LogicDeclarationCapture | undefined => {
  const runtime = makeCaptureRuntime<Sh>(args.moduleId)
  const capturedFields: Array<ModuleFields.FieldSpec> = []

  setRuntimeInternals(
    runtime as object,
    makeCaptureInternals(args.moduleId, runtime.instanceId, capturedFields),
  )

  try {
    const api = BoundApiRuntime.make<Sh, R>(args.shape, runtime, {
      getPhase: () => 'setup',
      phaseService: { current: 'setup' } satisfies LogicDiagnostics.LogicPhaseService,
      moduleId: args.moduleId,
      captureDeclarations: ({ fields }) => {
        if (!fields || typeof fields !== 'object') return
        capturedFields.push(fields)
      },
    })

    const built = args.build(api)
    if (isLogicDescriptor<Sh, R, E>(built)) {
      Effect.runSync(Effect.asVoid((built as any).setup as any) as any)
    }
  } catch (error) {
    if (error instanceof PublicLogicAuthoringShapeError) {
      throw error
    }
    return undefined
  }

  const normalized = capturedFields.filter((spec) => spec && typeof spec === 'object')
  if (normalized.length === 0) {
    return undefined
  }

  return {
    fields: normalized,
  }
}
