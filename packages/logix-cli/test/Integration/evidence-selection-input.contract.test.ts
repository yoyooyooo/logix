import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'

import { parseCliInvocation } from '../../src/internal/args.js'
import { readEvidenceInputs } from '../../src/internal/evidenceInput.js'
import { buildCliRuntimeWorkbenchAuthorityBundle } from '../../src/internal/workbenchProjection.js'
import { runCli } from '../../src/internal/entry.js'

describe('CLI final input grammar', () => {
  it('parses check with Program entry plus optional evidence and selection refs', async () => {
    const inv = await Effect.runPromise(parseCliInvocation([
      'check',
      '--runId',
      'parse-check',
      '--entry',
      './program.ts#BasicProgram',
      '--evidence',
      './evidence-package',
      '--selection',
      './selection.json',
    ], { helpText: 'help' }))

    expect(inv.kind).toBe('command')
    if (inv.kind !== 'command') throw new Error('expected command')
    expect(inv.command).toBe('check')
    if (inv.command !== 'check') throw new Error('expected check')
    expect(inv.entry).toEqual({ modulePath: './program.ts', exportName: 'BasicProgram' })
    expect(inv.evidence).toEqual({ ref: './evidence-package' })
    expect(inv.selection).toEqual({ ref: './selection.json' })
  })

  it('accepts trial mode startup and scenario only', async () => {
    const startup = await Effect.runPromise(parseCliInvocation([
      'trial',
      '--runId',
      't1',
      '--entry',
      './program.ts#BasicProgram',
      '--mode',
      'startup',
    ], { helpText: 'help' }))
    expect(startup.kind).toBe('command')
    if (startup.kind !== 'command') throw new Error('expected command')
    expect(startup.command).toBe('trial')
    if (startup.command !== 'trial') throw new Error('expected trial')
    expect(startup.trialMode).toBe('startup')

    await expect(Effect.runPromise(parseCliInvocation([
      'trial',
      '--runId',
      't2',
      '--entry',
      './program.ts#BasicProgram',
      '--mode',
      'report',
    ], { helpText: 'help' }))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
  })

  it('keeps trial scenario mode as structured failure until the core executor exists', async () => {
    const out = await Effect.runPromise(runCli([
      'trial',
      '--runId',
      'scenario-mode-blocked',
      '--entry',
      './program.ts#BasicProgram',
      '--mode',
      'scenario',
    ]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected CLI result')
    expect(out.result.ok).toBe(false)
    expect(out.result.command).toBe('trial')
    expect(out.result.error).toMatchObject({
      code: 'CLI_SCENARIO_INPUT_REQUIRED',
      message: 'trial --mode scenario 需要 --scenario <file>',
    })
    expect(out.result.primaryReportOutputKey).toBe('errorReport')
    expect(out.result.artifacts.map((artifact) => artifact.outputKey)).toEqual(['errorReport'])
    expect(out.result.artifacts.some((artifact) => artifact.outputKey === 'trialReport')).toBe(false)
  })

  it('keeps trial scenario input blocked instead of routing product playback as control-plane truth', async () => {
    const out = await Effect.runPromise(runCli([
      'trial',
      '--runId',
      'scenario-input-blocked',
      '--entry',
      './program.ts#BasicProgram',
      '--mode',
      'scenario',
      '--scenario',
      './scenario.json',
    ]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected CLI result')
    expect(out.result.ok).toBe(false)
    expect(out.result.command).toBe('trial')
    expect(out.result.inputCoordinate).toMatchObject({
      command: 'trial',
      trialMode: 'scenario',
      scenario: { ref: './scenario.json' },
    })
    expect(out.result.error).toMatchObject({
      code: 'CLI_SCENARIO_NOT_IMPLEMENTED',
      message: 'trial scenario mode requires a core-owned scenario executor before CLI can route it.',
    })
    expect(out.result.primaryReportOutputKey).toBe('errorReport')
    expect(out.result.artifacts.map((artifact) => artifact.outputKey)).toEqual(['errorReport'])
    expect(out.result.artifacts.some((artifact) => artifact.outputKey === 'trialReport')).toBe(false)
  })

  it('rejects toolbox-only options', async () => {
    await expect(Effect.runPromise(parseCliInvocation([
      'check',
      '--runId',
      'bad',
      '--entry',
      './program.ts#BasicProgram',
      '--in',
      './legacy',
    ], { helpText: 'help' }))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
    await expect(Effect.runPromise(parseCliInvocation([
      'trial',
      '--runId',
      'bad',
      '--entry',
      './program.ts#BasicProgram',
      '--ops',
      './delta.json',
    ], { helpText: 'help' }))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
  })
})

describe('CLI evidence and selection input handling', () => {
  it('reads canonical evidence package as provenance and selection manifest as hint only', async () => {
    const evidenceRef = path.resolve(__dirname, '../fixtures/evidence-package')
    const selectionRef = path.resolve(__dirname, '../fixtures/selection-manifest.json')

    const input = await Effect.runPromise(readEvidenceInputs({
      evidence: { ref: evidenceRef },
      selection: { ref: selectionRef },
    }))

    expect(input.evidence).toEqual({
      ref: evidenceRef,
      kind: 'CanonicalEvidencePackage',
      packageId: 'fixture:evidence:cli-basic',
      artifactOutputKeys: ['dvtools-session-snapshot'],
    })
    expect(input.selection).toEqual({
      ref: selectionRef,
      kind: 'LogixSelectionManifest',
      selectionId: 'fixture:selection:cli-basic',
      sessionId: 'session:1',
      findingId: 'finding:1',
      artifactOutputKey: 'dvtools-session-snapshot',
      focusRef: { sourceRef: 'src/basic.ts:1' },
      authority: 'hint-only',
    })
    expect(input).not.toHaveProperty('sessionTruth')
    expect(input).not.toHaveProperty('findingTruth')
    expect(input).not.toHaveProperty('reportTruth')

    const bundle = buildCliRuntimeWorkbenchAuthorityBundle({ evidenceInputs: input })
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('session:1')
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('finding:1')
    expect(bundle.selectionHints?.some((hint) => hint.kind === 'selected-session')).toBe(true)
  })

  it('rejects selection artifact keys that are absent from the evidence package', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-selection-key-'))
    const selectionRef = path.join(tmp, 'selection.json')
    await fs.writeFile(
      selectionRef,
      JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'LogixSelectionManifest',
          selectionId: 'selection:mismatch',
          artifactOutputKey: 'missing-artifact-key',
        },
        null,
        2,
      ),
      'utf8',
    )

    const evidenceRef = path.resolve(__dirname, '../fixtures/evidence-package')
    await expect(
      Effect.runPromise(readEvidenceInputs({
        evidence: { ref: evidenceRef },
        selection: { ref: selectionRef },
      })),
    ).rejects.toMatchObject({ code: 'CLI_INVALID_SELECTION' })
  })
})
