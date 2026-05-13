import { expect, test } from 'vitest'
import * as CorePublic from '@logixjs/core'
import * as ReactPublic from '../../../src/index.js'
import {
  compareDispatchShellABSamples,
  dispatchShellSameCommitABModes,
  dispatchShellShellModeEvidence,
  parseDispatchShellShellModeEnv,
  type DispatchShellABSample,
} from './dispatch-shell.runtime.js'

test('dispatch shell A/B helpers stay test-only and classify phase tax migration', () => {
  expect(dispatchShellSameCommitABModes).toEqual(['baseline', 'fastPath'])
  expect(parseDispatchShellShellModeEnv('0')).toBe('baseline')
  expect(parseDispatchShellShellModeEnv('1')).toBe('fastPath')
  expect(parseDispatchShellShellModeEnv(undefined)).toBe('baseline')

  expect(dispatchShellShellModeEvidence('fastPath')).toEqual({
    'runtime.shellMode': 'fastPath',
    'runtime.shellMode.source': 'test-only:same-commit-ab',
  })

  const baseline = {
    shellMode: 'baseline',
    totalMs: 12,
    phaseTiming: {
      traceCount: 1,
      bodyShellMs: 6,
      queueResolvePolicyMs: 1,
      commitPublishCommitMs: 1,
      commitStateUpdateDebugRecordMs: 0.1,
    },
  } satisfies DispatchShellABSample

  const fastPath = {
    shellMode: 'fastPath',
    totalMs: 10,
    phaseTiming: {
      traceCount: 1,
      bodyShellMs: 2,
      queueResolvePolicyMs: 2,
      commitPublishCommitMs: 1.5,
      commitStateUpdateDebugRecordMs: 0.4,
    },
  } satisfies DispatchShellABSample

  const comparison = compareDispatchShellABSamples(baseline, fastPath, { epsilonMs: 0.01 })

  expect(comparison.total.deltaMs).toBeCloseTo(-2)
  expect(comparison.phaseDeltas.find((delta) => delta.name === 'bodyShellMs')?.deltaMs).toBeCloseTo(-4)
  expect(comparison.phaseDeltas.find((delta) => delta.name === 'queueResolvePolicyMs')?.deltaMs).toBeCloseTo(1)
  expect(comparison.migratedCost).toBe(true)
  expect(comparison.migratedRisks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ group: 'queue/lane', name: 'queueResolvePolicyMs' }),
      expect.objectContaining({ group: 'commit', name: 'commitPublishCommitMs' }),
      expect.objectContaining({ group: 'diagnostics', name: 'commitStateUpdateDebugRecordMs' }),
    ]),
  )
})

test('dispatch shell A/B mode does not leak through public package roots', () => {
  const publicKeys = [...Object.keys(CorePublic), ...Object.keys(ReactPublic)].join(' ')
  expect(publicKeys).not.toMatch(/shellMode|txnShellFastPath|sameCommitAB/i)
})
