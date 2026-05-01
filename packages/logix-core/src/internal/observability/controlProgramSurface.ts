import { fnv1a32, stableStringify } from '../digest.js'
import type { WorkflowStaticIrV1 } from '../workflow/model.js'

export type ControlProgramSurfaceVersion = 1

export type ControlProgramSurfaceV1 = {
  readonly version: ControlProgramSurfaceVersion
  readonly digest: string
  readonly programs: ReadonlyArray<WorkflowStaticIrV1>
}

export type ControlProgramStaticIrV1 = WorkflowStaticIrV1
export type { WorkflowStaticIrV1 } from '../workflow/model.js'

export type ControlProgramSurface = ControlProgramSurfaceV1

const makeDigest = (value: unknown): string => `control_program_surface_v1:${fnv1a32(stableStringify(value))}`

export const exportControlProgramSurface = (programs: ReadonlyArray<WorkflowStaticIrV1>): ControlProgramSurfaceV1 => {
  const sorted = Array.from(programs).sort((a, b) =>
    a.programId < b.programId ? -1 : a.programId > b.programId ? 1 : 0,
  )
  const base = { version: 1 as const, programs: sorted } as const
  return { ...base, digest: makeDigest(base) }
}
