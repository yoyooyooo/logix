import { describe, expect, it } from 'vitest'
import {
  classifyRuntimeHotPathZone,
  getHotPathEvidencePolicy,
  isSteadyStateHotPathZone,
  shouldReopenHotPath,
} from '../../src/internal/runtime/hotPathPolicy.js'

describe('Runtime hot-path policy', () => {
  it('classifies kernel / shell / control-plane / process / runner zones from code paths', () => {
    expect(
      classifyRuntimeHotPathZone('packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts'),
    ).toBe('kernel')
    expect(classifyRuntimeHotPathZone('packages/logix-core/src/internal/runtime/AppRuntime.ts')).toBe('runtime-shell')
    expect(classifyRuntimeHotPathZone('packages/logix-core/src/ControlPlane.ts')).toBe('control-plane')
    expect(
      classifyRuntimeHotPathZone('packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts'),
    ).toBe('process')
    expect(
      classifyRuntimeHotPathZone('packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts'),
    ).toBe('runner')
    expect(classifyRuntimeHotPathZone('packages/logix-core/src/internal/reflection-api.ts')).toBe('control-plane')
  })

  it('marks only kernel as steady-state hot path', () => {
    expect(isSteadyStateHotPathZone('kernel')).toBe(true)
    expect(isSteadyStateHotPathZone('runtime-shell')).toBe(false)
    expect(isSteadyStateHotPathZone('control-plane')).toBe(false)
    expect(isSteadyStateHotPathZone('process')).toBe(false)
    expect(isSteadyStateHotPathZone('runner')).toBe(false)
    expect(isSteadyStateHotPathZone('unknown')).toBe(false)
  })

  it('routes evidence requirements by zone and change profile', () => {
    expect(getHotPathEvidencePolicy({ zone: 'kernel', activeSpecId: '123-runtime-kernel-hotpath-convergence' })).toEqual({
      mode: 'baseline-diff',
      activeRoute: 'specs/123-runtime-kernel-hotpath-convergence/perf/*.json',
      backgroundRoutes: ['specs/115-core-kernel-extraction/perf/*.json'],
      noGo: ['comparable=false', 'profile/env drift', '口头结论'],
    })

    expect(
      getHotPathEvidencePolicy({
        zone: 'control-plane',
        activeSpecId: '123-runtime-kernel-hotpath-convergence',
      }),
    ).toEqual({
      mode: 'audit-only',
      activeRoute: null,
      backgroundRoutes: ['docs/archive/perf/**'],
      noGo: [],
    })

    expect(
      getHotPathEvidencePolicy({
        zone: 'control-plane',
        activeSpecId: '123-runtime-kernel-hotpath-convergence',
        diagnosticsOnlyGain: true,
      }),
    ).toEqual({
      mode: 'baseline-diff',
      activeRoute: 'specs/123-runtime-kernel-hotpath-convergence/perf/*.json',
      backgroundRoutes: ['specs/115-core-kernel-extraction/perf/*.json'],
      noGo: ['只证明 diagnostics=on 局部收益，无法解释 default steady-state'],
    })
  })

  it('follows reopen triggers from the ledger', () => {
    expect(shouldReopenHotPath('new-reproducible-runtime-failure')).toBe(true)
    expect(shouldReopenHotPath('new-clean-comparable-evidence')).toBe(true)
    expect(shouldReopenHotPath('new-runtime-sla-breach')).toBe(true)
    expect(shouldReopenHotPath('archive-only-historical-note')).toBe(false)
    expect(shouldReopenHotPath('diagnostics-only-local-gain')).toBe(false)
  })
})
