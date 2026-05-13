import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import path from 'node:path'

import {
  buildCliRuntimeWorkbenchAuthorityBundle,
  deriveCliWorkbenchProjection,
} from '../../src/internal/workbenchProjection.js'
import { readEvidenceInputs } from '../../src/internal/evidenceInput.js'
import { makeControlPlaneReportFixture } from '../support/controlPlaneReport.js'

describe('CLI runtime workbench projection', () => {
  it('uses evidence and report as truth while keeping selection hint-only', async () => {
    const evidenceRef = path.resolve(__dirname, '../fixtures/evidence-package')
    const selectionRef = path.resolve(__dirname, '../fixtures/selection-manifest.json')
    const evidenceInputs = await Effect.runPromise(
      readEvidenceInputs({
        evidence: { ref: evidenceRef },
        selection: { ref: selectionRef },
      }),
    )
    const report = makeControlPlaneReportFixture({
      stage: 'check',
      mode: 'static',
      verdict: 'FAIL',
      errorCode: 'fixture-failed',
    })

    const bundle = buildCliRuntimeWorkbenchAuthorityBundle({ evidenceInputs, report })
    expect(bundle.truthInputs.map((input) => input.kind)).toEqual(['evidence-package', 'control-plane-report'])
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('fixture:selection:cli-basic')
    expect(bundle.selectionHints?.map((hint) => hint.kind)).toEqual([
      'selected-session',
      'selected-finding',
      'selected-artifact',
      'imported-selection-manifest',
    ])

    const projection = deriveCliWorkbenchProjection({ evidenceInputs, report })
    expect(projection.sessions.map((session) => session.authorityRef.kind)).toEqual([
      'evidence-package',
      'control-plane-report',
    ])
    expect(Object.keys(projection.indexes?.artifactsById ?? {})).toContain('artifact:dvtools-session-snapshot')
  })

  it('does not import or depend on the DVTools protocol package', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(path.resolve(__dirname, '../../src/internal/workbenchProjection.ts'), 'utf8'),
    )

    expect(source).not.toContain('@logixjs/devtools-react')
    expect(source).not.toContain('packages/logix-devtools-react')
  })
})
