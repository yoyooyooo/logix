import type { SerializableErrorSummary } from '../../runtime/core/errorSummary.js'
import { toSerializableErrorSummary } from '../../runtime/core/errorSummary.js'
import { isJsonValue, type JsonValue } from '../jsonValue.js'
import type { ArtifactEnvelope, ArtifactKey, TrialRunArtifacts } from './model.js'
import { isArtifactKey } from './model.js'
import type { TrialRunArtifactExporter, TrialRunArtifactInspectionContext } from './exporter.js'
import { digestJsonValue } from './digest.js'

export interface TrialRunArtifactsBudgets {
  /**
   * Per-artifact maximum serialized bytes (UTF-8).
   * Default: 50KB.
   */
  readonly maxBytes?: number
}

export interface CollectTrialRunArtifactsOptions {
  readonly exporters: ReadonlyArray<TrialRunArtifactExporter>
  readonly ctx: TrialRunArtifactInspectionContext
  readonly budgets?: TrialRunArtifactsBudgets
}

const toErrorSummaryWithCode = (cause: unknown, code: string, hint?: string): SerializableErrorSummary => {
  const base = toSerializableErrorSummary(cause).errorSummary
  return {
    name: base.name,
    message: base.message,
    code,
    hint: hint ?? base.hint,
  }
}

const defaultArtifactBudgetBytes = 50 * 1024

const budgetOf = (budgets: TrialRunArtifactsBudgets | undefined): number =>
  typeof budgets?.maxBytes === 'number' && Number.isFinite(budgets.maxBytes) && budgets.maxBytes > 0
    ? budgets.maxBytes
    : defaultArtifactBudgetBytes

type Collected = {
  readonly artifactKey: ArtifactKey
  readonly envelope: ArtifactEnvelope
}

const makeConflictEnvelope = (artifactKey: ArtifactKey, exporterIds: ReadonlyArray<string>): Collected => {
  const ids = Array.from(new Set(exporterIds.map((s) => String(s)).filter((s) => s.length > 0))).sort((a, b) =>
    a.localeCompare(b),
  )
  return {
    artifactKey,
    envelope: {
      artifactKey,
      ok: false,
      error: {
        name: 'ArtifactKeyConflictError',
        message: `[Logix] TrialRun artifact key conflict: ${artifactKey}`,
        code: 'ArtifactKeyConflict',
        hint: ids.length > 0 ? `conflictingExporters=${ids.join(',')}` : undefined,
      },
    },
  }
}

const truncateJsonValue = (
  value: JsonValue,
  maxBytes: number,
): { readonly value: JsonValue; readonly actualBytes: number; readonly digest: string } => {
  const analyzed = digestJsonValue(value)
  const json = analyzed.stableJson
  const bytes = analyzed.bytes
  if (bytes <= maxBytes) {
    return { value, actualBytes: bytes, digest: analyzed.digest }
  }

  const previewChars = Math.min(json.length, Math.max(0, Math.min(256, maxBytes)))
  const preview = json.slice(0, previewChars)
  return {
    value: {
      _tag: 'oversized',
      bytes,
      preview,
    },
    actualBytes: bytes,
    digest: analyzed.digest,
  }
}

export const collectTrialRunArtifacts = (options: CollectTrialRunArtifactsOptions): TrialRunArtifacts | undefined => {
  const exportersSorted = Array.from(options.exporters).sort((a, b) => {
    const ka = String(a?.artifactKey ?? '')
    const kb = String(b?.artifactKey ?? '')
    if (ka < kb) return -1
    if (ka > kb) return 1
    const ia = String(a?.exporterId ?? '')
    const ib = String(b?.exporterId ?? '')
    return ia.localeCompare(ib)
  })

  const conflicts = new Map<ArtifactKey, Array<string>>()
  for (const ex of exportersSorted) {
    const key = ex?.artifactKey
    const id = String(ex?.exporterId ?? '')
    if (!isArtifactKey(key)) {
      continue
    }
    const current = conflicts.get(key)
    if (current) current.push(id)
    else conflicts.set(key, [id])
  }

  const conflictKeys = new Set<ArtifactKey>()
  for (const [k, ids] of conflicts) {
    const unique = Array.from(new Set(ids))
    if (unique.length > 1) {
      conflictKeys.add(k)
    }
  }

  const maxBytes = budgetOf(options.budgets)
  const collected: Array<Collected> = []

  for (const exporter of exportersSorted) {
    const artifactKey = exporter?.artifactKey
    if (!isArtifactKey(artifactKey)) {
      continue
    }
    if (conflictKeys.has(artifactKey)) {
      continue
    }

    try {
      const value = exporter.export(options.ctx)
      if (value === undefined) continue
      if (!isJsonValue(value)) {
        collected.push({
          artifactKey,
          envelope: {
            artifactKey,
            ok: false,
            error: toErrorSummaryWithCode(
              new Error(`[Logix] Artifact exporter returned non-JsonValue: ${exporter.exporterId}`),
              'ArtifactNonSerializable',
              `artifactKey=${artifactKey} exporterId=${exporter.exporterId}`,
            ),
          },
        })
        continue
      }

      const truncated = truncateJsonValue(value, maxBytes)
      const envelope: ArtifactEnvelope = {
        artifactKey,
        ok: true,
        value: truncated.value,
        digest: truncated.digest,
        ...(truncated.actualBytes > maxBytes
          ? {
              truncated: true,
              budgetBytes: maxBytes,
              actualBytes: truncated.actualBytes,
            }
          : {
              budgetBytes: maxBytes,
              actualBytes: truncated.actualBytes,
            }),
      }

      collected.push({ artifactKey, envelope })
    } catch (e) {
      collected.push({
        artifactKey,
        envelope: {
          artifactKey,
          ok: false,
          error: toErrorSummaryWithCode(
            e,
            'ArtifactExportFailed',
            `artifactKey=${artifactKey} exporterId=${exporter.exporterId}`,
          ),
        },
      })
    }
  }

  for (const conflictKey of Array.from(conflictKeys).sort((a, b) => a.localeCompare(b))) {
    collected.push(makeConflictEnvelope(conflictKey, conflicts.get(conflictKey) ?? []))
  }

  if (collected.length === 0) return undefined

  collected.sort((a, b) => a.artifactKey.localeCompare(b.artifactKey))

  return Object.fromEntries(collected.map((c) => [c.artifactKey, c.envelope])) satisfies TrialRunArtifacts
}
