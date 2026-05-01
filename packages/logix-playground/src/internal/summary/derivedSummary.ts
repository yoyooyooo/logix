import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { RuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { ClassifiedPlaygroundFailure } from '../session/errors.js'
import type { ProgramSessionState } from '../session/programSession.js'
import { derivePlaygroundWorkbenchProjection } from './workbenchProjection.js'

export interface PreviewSessionSummaryInput {
  readonly status: 'idle' | 'loading' | 'ready' | 'failed' | 'disposed'
  readonly errors?: ReadonlyArray<ClassifiedPlaygroundFailure>
}

export interface ProgramRunSummaryInput {
  readonly status: 'idle' | 'running' | 'passed' | 'failed' | 'unavailable'
  readonly runId?: string
  readonly failure?: ClassifiedPlaygroundFailure
}

export interface ControlPlaneSummaryInput {
  readonly status: 'idle' | 'running' | 'passed' | 'failed' | 'unavailable'
  readonly report?: VerificationControlPlaneReport
  readonly failure?: ClassifiedPlaygroundFailure
}

export interface DerivedPlaygroundSummary {
  readonly projectId: string
  readonly revision: number
  readonly changedFiles: ReadonlyArray<string>
  readonly projection: RuntimeWorkbenchProjectionIndex
  readonly preview: { readonly status: string; readonly errorCount: number }
  readonly programRun?: { readonly status: string; readonly runId?: string }
  readonly programSession?: {
    readonly status: string
    readonly sessionId: string
    readonly revision: number
    readonly stale: boolean
    readonly lastActionTag?: string
    readonly operationSeq: number
  }
  readonly check?: { readonly status: string; readonly verdict?: string }
  readonly trialStartup?: { readonly status: string; readonly verdict?: string }
  readonly errors: ReadonlyArray<{ readonly kind: string; readonly message: string }>
  readonly truncated?: boolean
}

export interface DerivePlaygroundSummaryInput {
  readonly snapshot: ProjectSnapshot
  readonly preview?: PreviewSessionSummaryInput
  readonly programRun?: ProgramRunSummaryInput
  readonly programSession?: ProgramSessionState
  readonly check?: ControlPlaneSummaryInput
  readonly trialStartup?: ControlPlaneSummaryInput
  readonly projection?: RuntimeWorkbenchProjectionIndex
  readonly maxErrors?: number
}

const collectErrors = (input: DerivePlaygroundSummaryInput): ReadonlyArray<ClassifiedPlaygroundFailure> => [
  ...(input.preview?.errors ?? []),
  ...(input.programRun?.failure ? [input.programRun.failure] : []),
  ...(input.check?.failure ? [input.check.failure] : []),
  ...(input.trialStartup?.failure ? [input.trialStartup.failure] : []),
]

export const derivePlaygroundSummary = (input: DerivePlaygroundSummaryInput): DerivedPlaygroundSummary => {
  const maxErrors = input.maxErrors ?? 20
  const errors = collectErrors(input)
  const visibleErrors = errors.slice(0, maxErrors)
  const projection =
    input.projection ??
    derivePlaygroundWorkbenchProjection({
      snapshot: input.snapshot,
      programRun: input.programRun?.runId
        ? input.programRun.status === 'passed'
          ? {
              status: 'passed',
              runId: input.programRun.runId,
              value: { status: input.programRun.status },
              valueKind: 'json',
              lossy: false,
            }
          : input.programRun.failure
            ? {
                status: 'failed',
                runId: input.programRun.runId,
                failure: {
                  kind: input.programRun.failure.kind === 'run' ? 'runtime' : 'unavailable',
                  message: input.programRun.failure.message,
                },
              }
            : undefined
        : undefined,
      checkReport: input.check?.report,
      trialStartupReport: input.trialStartup?.report,
      programSession: input.programSession,
      previewFailure: input.preview?.errors?.[0] ? { message: input.preview.errors[0].message } : undefined,
    })

  return {
    projectId: input.snapshot.projectId,
    revision: input.snapshot.revision,
    projection,
    changedFiles: Array.from(input.snapshot.files.values())
      .filter((file) => file.content !== file.originalContent)
      .map((file) => file.path)
      .sort(),
    preview: {
      status: input.preview?.status ?? 'idle',
      errorCount: input.preview?.errors?.length ?? 0,
    },
    programRun: input.programRun
      ? {
          status: input.programRun.status,
          ...(input.programRun.runId ? { runId: input.programRun.runId } : null),
        }
      : undefined,
    programSession: input.programSession
      ? {
          status: input.programSession.status,
          sessionId: input.programSession.sessionId,
          revision: input.programSession.revision,
          stale: input.programSession.stale,
          ...(input.programSession.lastOperation?.actionTag
            ? { lastActionTag: input.programSession.lastOperation.actionTag }
            : null),
          operationSeq: input.programSession.operationSeq,
        }
      : undefined,
    check: input.check
      ? {
          status: input.check.status,
          ...(input.check.report ? { verdict: input.check.report.verdict } : null),
        }
      : undefined,
    trialStartup: input.trialStartup
      ? {
          status: input.trialStartup.status,
          ...(input.trialStartup.report ? { verdict: input.trialStartup.report.verdict } : null),
        }
      : undefined,
    errors: visibleErrors.map((error) => ({ kind: error.kind, message: error.message })),
    truncated: errors.length > visibleErrors.length ? true : undefined,
  }
}
