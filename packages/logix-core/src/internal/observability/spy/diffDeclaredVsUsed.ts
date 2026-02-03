import type { ModuleManifest } from '../../reflection/manifest.js'
import type { ServiceUseEvidence } from './SpyCollector.js'
import type { SpyEvidenceReportDiff } from './exportSpyEvidenceReport.js'

const uniqSorted = (input: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out = Array.from(new Set(input.filter((x) => typeof x === 'string' && x.length > 0)))
  out.sort()
  return out
}

export const diffDeclaredVsUsed = (params: {
  readonly usedServices: ReadonlyArray<ServiceUseEvidence>
  readonly declaredManifest?: ModuleManifest
}): SpyEvidenceReportDiff => {
  const used = uniqSorted(params.usedServices.map((x) => x.serviceId))
  const declared = uniqSorted((params.declaredManifest?.servicePorts ?? []).map((p) => p.serviceId))

  const usedSet = new Set(used)
  const declaredSet = new Set(declared)

  const usedButNotDeclared = used.filter((id) => !declaredSet.has(id))
  const declaredButNotUsed = declared.filter((id) => !usedSet.has(id))

  return { usedButNotDeclared, declaredButNotUsed }
}

