import { describe, expect, it } from 'vitest'
import {
  buildWorkbenchEvidenceExport,
  buildRuntimeWorkbenchAuthorityBundle,
  deriveWorkbenchHostViewModel,
  normalizeImportedEvidencePackage,
  normalizeLiveSnapshot,
} from '../../src/internal/state/workbench/index.js'

describe('DVTools evidence export loop', () => {
  it('exports canonical evidence package plus non-authority selection manifest', () => {
    const workbench = deriveWorkbenchHostViewModel(
      normalizeLiveSnapshot({
        events: [
          {
            kind: 'state',
            label: 'state:update',
            runtimeLabel: 'app',
            moduleId: 'FormModule',
            instanceId: 'form-1',
            timestamp: 1,
            txnSeq: 1,
            opSeq: 1,
            eventSeq: 1,
            meta: {
              focusRef: { sourceRef: 'src/form.ts:1' },
              artifactKey: 'trial-report',
            },
          },
        ],
        latestStates: new Map(),
        runtimes: [],
      } as any),
    )

    const exported = buildWorkbenchEvidenceExport({
      workbench,
      selectedSessionId: workbench.sessions[0]!.id,
      selectedFindingId: workbench.findings[0]?.id,
      selectedArtifactKey: workbench.findings[0]?.artifacts[0]?.artifactKey,
    })

    expect(exported.evidencePackage).toBeDefined()
    expect(exported.selectionManifest).toMatchObject({
      sessionId: workbench.sessions[0]!.id,
    })
    expect(exported.selectionManifest).not.toHaveProperty('sessionTruth')
    expect(exported.selectionManifest).not.toHaveProperty('findingTruth')
    expect(exported.selectionManifest).not.toHaveProperty('reportTruth')

    const imported = normalizeImportedEvidencePackage({
      ...(exported.evidencePackage as Record<string, unknown>),
      selectionManifest: exported.selectionManifest,
    })
    const bundle = buildRuntimeWorkbenchAuthorityBundle(imported)
    expect(bundle.truthInputs.some((input) => JSON.stringify(input).includes(workbench.sessions[0]!.id))).toBe(false)
    expect(bundle.selectionHints?.some((hint) => hint.kind === 'selected-session')).toBe(true)
  })
})
