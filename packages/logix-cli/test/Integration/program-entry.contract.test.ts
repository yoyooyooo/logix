import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'
import { loadProgramEntry } from '../../src/internal/programEntry.js'
import { normalizeCommandResultForRepeatability, primaryReportInline } from '../support/commandResult.js'

const fixture = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const moduleOnlyFixture = path.resolve(__dirname, '../fixtures/BasicModuleOnly.ts')
const fakeProgramFixture = path.resolve(__dirname, '../fixtures/FakeProgram.ts')
const importFailureFixture = path.resolve(__dirname, '../fixtures/ImportFailureProgram.ts')
const repairableEntryFixture = path.resolve(__dirname, '../fixtures/RepairableEntry.ts')

const expectResult = async (argv: ReadonlyArray<string>) => {
  const out = await Effect.runPromise(runCli(argv))
  expect(out.kind).toBe('result')
  if (out.kind !== 'result') throw new Error('expected result')
  return out.result
}

describe('CLI Program entry authority', () => {
  it('loads a Program export', async () => {
    const program = await Effect.runPromise(loadProgramEntry({ modulePath: fixture, exportName: 'BasicProgram' }))
    expect((program as any)._kind).toBe('Program')
  })

  it('rejects Module and Logic exports', async () => {
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'ModuleOnly' }))).rejects.toMatchObject({
      code: 'CLI_ENTRY_NOT_PROGRAM',
    })
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'LogicOnly' }))).rejects.toMatchObject({
      code: 'CLI_ENTRY_NOT_PROGRAM',
    })
  })

  it('rejects missing export and import failure as entry failures', async () => {
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: fixture, exportName: 'MissingProgram' }))).rejects.toMatchObject({
      code: 'CLI_ENTRY_NO_EXPORT',
    })
    await expect(
      Effect.runPromise(loadProgramEntry({ modulePath: importFailureFixture, exportName: 'ImportFailureProgram' })),
    ).rejects.toMatchObject({
      code: 'CLI_ENTRY_IMPORT_FAILED',
    })
  })

  it('rejects fake Program exports that lack runtime blueprint authority', async () => {
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: fakeProgramFixture, exportName: 'FakeProgram' }))).rejects.toMatchObject({
      code: 'PROGRAM_BLUEPRINT_MISSING',
    })
  })

  it('returns a 162 transport-gate envelope for entry failures without inventing a next stage', async () => {
    const result = await expectResult([
      'check',
      '--runId',
      'entry-fake-program',
      '--entry',
      `${fakeProgramFixture}#FakeProgram`,
    ])

    expect(result.ok).toBe(false)
    expect(result.command).toBe('check')
    expect(result.inputCoordinate.entry).toEqual({ modulePath: fakeProgramFixture, exportName: 'FakeProgram' })
    expect(result.primaryReportOutputKey).toBe('errorReport')
    expect(result.artifacts.map((artifact) => artifact.outputKey)).toEqual(['errorReport'])
    expect(result.error?.code).toBe('PROGRAM_BLUEPRINT_MISSING')
    expect(primaryReportInline(result)).toMatchObject({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'FAIL',
      errorCode: 'PROGRAM_BLUEPRINT_MISSING',
      nextRecommendedStage: null,
    })
  })

  it('keeps entry failure transport shape stable across repeated runs', async () => {
    const argv = [
      'trial',
      '--runId',
      'entry-logic-repeated',
      '--entry',
      `${moduleOnlyFixture}#LogicOnly`,
      '--mode',
      'startup',
    ] as const

    const first = await expectResult(argv)
    const second = await expectResult(argv)

    expect(first.error?.code).toBe('CLI_ENTRY_NOT_PROGRAM')
    expect(primaryReportInline(first)).toMatchObject({ nextRecommendedStage: null })
    expect(normalizeCommandResultForRepeatability(second)).toEqual(normalizeCommandResultForRepeatability(first))
  })

  it('reruns the same entry coordinate into a runtime stage result after repair', async () => {
    const failing = await expectResult([
      'check',
      '--runId',
      'entry-repair-rerun-before',
      '--entry',
      `${repairableEntryFixture}#RepairableProgram`,
    ])
    expect(failing.ok).toBe(false)
    expect(failing.error?.code).toBe('PROGRAM_BLUEPRINT_MISSING')
    expect(failing.inputCoordinate.entry).toEqual({ modulePath: repairableEntryFixture, exportName: 'RepairableProgram' })

    const repaired = await expectResult([
      'check',
      '--runId',
      'entry-repair-rerun-after',
      '--entry',
      `${repairableEntryFixture}#RepairedProgram`,
    ])

    expect(repaired.ok).toBe(true)
    expect(repaired.primaryReportOutputKey).toBe('checkReport')
    expect(repaired.inputCoordinate.entry?.modulePath).toBe(failing.inputCoordinate.entry?.modulePath)
    expect(primaryReportInline(repaired)).toMatchObject({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'PASS',
    })
  })
})
