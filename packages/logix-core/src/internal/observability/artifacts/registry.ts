import type { TrialRunArtifactExporter } from './exporter.js'

const ARTIFACT_EXPORTERS = Symbol.for('logix.module.trialRunArtifactExporters')

export const registerTrialRunArtifactExporter = (tag: unknown, exporter: TrialRunArtifactExporter): void => {
  if (!tag || (typeof tag !== 'object' && typeof tag !== 'function')) {
    throw new Error('[Logix] registerTrialRunArtifactExporter: invalid module tag')
  }

  const current = ((tag as any)[ARTIFACT_EXPORTERS] ?? []) as unknown
  const next = Array.isArray(current) ? [...current, exporter] : [exporter]
  ;(tag as any)[ARTIFACT_EXPORTERS] = next
}

export const getTrialRunArtifactExporters = (tag: unknown): ReadonlyArray<TrialRunArtifactExporter> => {
  if (!tag || (typeof tag !== 'object' && typeof tag !== 'function')) {
    return []
  }

  const current = (tag as any)[ARTIFACT_EXPORTERS] as unknown
  if (!Array.isArray(current)) return []
  return current.filter((x): x is TrialRunArtifactExporter => x && typeof x === 'object')
}
