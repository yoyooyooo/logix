import { fnv1a32, stableStringify } from '../digest.js'
import type { WorkflowStaticIrV1 } from '../workflow/model.js'

export type WorkflowSurfaceVersion = 1

export type WorkflowSurfaceV1 = {
  readonly version: WorkflowSurfaceVersion
  readonly digest: string
  readonly programs: ReadonlyArray<WorkflowStaticIrV1>
}

export type WorkflowSurface = WorkflowSurfaceV1

const makeDigest = (value: unknown): string => `workflow_surface_v1:${fnv1a32(stableStringify(value))}`

export const exportWorkflowSurface = (programs: ReadonlyArray<WorkflowStaticIrV1>): WorkflowSurfaceV1 => {
  const sorted = Array.from(programs).sort((a, b) => a.programId.localeCompare(b.programId))
  const base = { version: 1 as const, programs: sorted } as const
  return { ...base, digest: makeDigest(base) }
}
