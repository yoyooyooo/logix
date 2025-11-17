import type { StateTraitProgram } from '../state-trait/model.js'
import { isDevEnv } from '../runtime/core/env.js'
import { exportStaticIr } from '../state-trait/ir.js'

// Debug/Devtools only: records StateTraitProgram by moduleId.
// - Not used for runtime behavior decisions.
// - In production, stores nothing by default to avoid extra memory footprint.

const programsByIdAndDigest = new Map<string, Map<string, StateTraitProgram<any>>>()

const latestDigestById = new Map<string, string>()

// Devtools-only: avoid unbounded growth when build/reflection generates many Programs.
const MAX_VERSIONS_PER_MODULE = 8

export const registerModuleProgram = (moduleId: string, program: StateTraitProgram<any>): void => {
  if (!isDevEnv()) {
    // Production: do not register by default to avoid long-lived Program indexes.
    // If Devtools is needed in production, adjust via env vars or build-time configuration.
    return
  }

  const ir = exportStaticIr({ program, moduleId, version: '009' })
  const digest = ir.digest

  let versions = programsByIdAndDigest.get(moduleId)
  if (!versions) {
    versions = new Map()
    programsByIdAndDigest.set(moduleId, versions)
  }

  versions.set(digest, program)
  latestDigestById.set(moduleId, digest)

  if (versions.size > MAX_VERSIONS_PER_MODULE) {
    const oldest = versions.keys().next().value as string | undefined
    if (oldest) versions.delete(oldest)
  }
}

export const getModuleProgramById = (moduleId: string): StateTraitProgram<any> | undefined => {
  const latestDigest = latestDigestById.get(moduleId)
  if (!latestDigest) return undefined
  return programsByIdAndDigest.get(moduleId)?.get(latestDigest)
}

export const getModuleProgramByIdAndDigest = (moduleId: string, digest: string): StateTraitProgram<any> | undefined =>
  programsByIdAndDigest.get(moduleId)?.get(digest)

export const getModuleProgramDigestsById = (moduleId: string): ReadonlyArray<string> =>
  Array.from(programsByIdAndDigest.get(moduleId)?.keys() ?? [])
