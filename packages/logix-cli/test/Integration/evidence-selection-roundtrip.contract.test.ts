import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

const entryPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const entry = `${entryPath}#BasicProgram`
const evidenceRef = path.resolve(__dirname, '../fixtures/dvtools-roundtrip/evidence-package')
const selectionRef = path.resolve(__dirname, '../fixtures/dvtools-roundtrip/selection-manifest.json')

describe('CLI evidence and selection roundtrip', () => {
  it('links DVTools evidence and selection through artifacts without owning truth', async () => {
    const out = await Effect.runPromise(
      runCli([
        'check',
        '--runId',
        'dvtools-roundtrip-check',
        '--entry',
        entry,
        '--evidence',
        evidenceRef,
        '--selection',
        selectionRef,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const keys = out.result.artifacts.map((artifact) => artifact.outputKey)
    expect(keys).toContain('evidenceInput')
    expect(keys).toContain('selectionManifest')
    expect(keys).toContain('checkReport')

    const selection = out.result.artifacts.find((artifact) => artifact.outputKey === 'selectionManifest')
    expect(selection?.kind).toBe('SelectionManifestInput')
    expect(selection?.inline).toMatchObject({
      kind: 'LogixSelectionManifest',
      selectionId: 'fixture:selection:dvtools-roundtrip',
      artifactOutputKey: 'dvtools-selected-finding',
      focusRef: { sourceRef: 'examples/checkout.ts:42' },
      authority: 'hint-only',
    })
    expect(selection?.inline).not.toHaveProperty('evidenceTruth')
    expect(selection?.inline).not.toHaveProperty('reportTruth')
    expect(keys.some((key) => key.startsWith('artifact://'))).toBe(false)
    expect(out.result.primaryReportOutputKey).toBe('checkReport')
    expect(out.result.inputCoordinate.evidence).toEqual({ ref: evidenceRef })
    expect(out.result.inputCoordinate.selection).toEqual({ ref: selectionRef })
  })

  it('rejects selection artifact keys outside the canonical evidence package namespace', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-dvtools-mismatch-'))
    const badSelection = path.join(tmp, 'selection.json')
    await fs.writeFile(
      badSelection,
      JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'LogixSelectionManifest',
          selectionId: 'fixture:selection:mismatch',
          artifactOutputKey: 'unknown-dvtools-key',
        },
        null,
        2,
      ),
      'utf8',
    )

    const out = await Effect.runPromise(
      runCli([
        'check',
        '--runId',
        'dvtools-roundtrip-mismatch',
        '--entry',
        entry,
        '--evidence',
        evidenceRef,
        '--selection',
        badSelection,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_INVALID_SELECTION')
    const report = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)?.inline
    expect(report).toMatchObject({ nextRecommendedStage: null })
  })
})
