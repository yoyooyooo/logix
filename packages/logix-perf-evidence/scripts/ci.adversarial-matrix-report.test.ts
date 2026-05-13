import { describe, expect, it } from 'vitest'
import {
  ADVERSARIAL_REQUIRED_HOT_PATHS,
  classifyAdversarialMatrix,
  renderAdversarialMatrixMarkdown,
  type AdversarialMatrixDiffLike,
} from './ci.adversarial-matrix-report.js'

const passingCells = ADVERSARIAL_REQUIRED_HOT_PATHS.map((hotPath) => ({
  cellId: `${hotPath}::seed=1`,
  hotPath,
  status: 'pass' as const,
  axes: { seed: 1 },
}))

const baseDiff = (override: Partial<AdversarialMatrixDiffLike> = {}): AdversarialMatrixDiffLike => ({
  schemaVersion: 1,
  matrixId: 'logix.adversarial.runtime.v1',
  matrixHash: 'sha256:test',
  profile: 'adversarial-default',
  envId: 'local-test',
  meta: { comparability: { comparable: true } },
  summary: {
    regressions: 0,
    budgetExceeded: 0,
    timeouts: 0,
    missingSuites: 0,
    stabilityWarnings: 0,
  },
  cells: passingCells,
  ...override,
})

describe('Adversarial Performance Matrix report', () => {
  it('classifies a complete default matrix with clean cells as hard tax_removed evidence', () => {
    const report = classifyAdversarialMatrix({ diff: baseDiff() })

    expect(report.classification).toBe('tax_removed')
    expect(report.claimStrength).toBe('hard')
    expect(report.blockers).toEqual([])
    expect(report.missingEvidence).toEqual([])
    expect(report.requiredHotPaths.every((item) => item.present)).toBe(true)
  })

  it('keeps adversarial-quick evidence as clue-only stability evidence', () => {
    const report = classifyAdversarialMatrix({ diff: baseDiff({ profile: 'adversarial-quick' }) })

    expect(report.classification).toBe('stable_guarded')
    expect(report.claimStrength).toBe('clue')
    expect(report.allowedClaims.join('\n')).toContain('guarded stability')
  })

  it('blocks on systemic cells and non-comparable evidence', () => {
    const report = classifyAdversarialMatrix({
      diff: baseDiff({
        meta: { comparability: { comparable: false } },
        cells: [
          ...passingCells.slice(0, -1),
          { cellId: 'react.strictSuspenseJitter::bad', hotPath: 'react.strictSuspenseJitter', status: 'systemic' },
        ],
      }),
    })

    expect(report.classification).toBe('blocked')
    expect(report.claimStrength).toBe('none')
    expect(report.blockers).toContain('diff evidence is not comparable')
    expect(report.blockers.join('\n')).toContain('react.strictSuspenseJitter::bad')
  })

  it('detects cost and risk migration even when the primary cell status passes', () => {
    const report = classifyAdversarialMatrix({
      diff: baseDiff({
        cells: passingCells.map((cell) =>
          cell.hotPath === 'runtimeStore.noTearingTickNotify'
            ? {
                cellId: 'runtimeStore.noTearingTickNotify::migrated',
                hotPath: 'runtimeStore.noTearingTickNotify',
                status: 'pass',
                phaseDeltas: { reactRenderMs: 2.5 },
                counterDeltas: { runSyncFallbackCount: 1 },
              }
            : cell,
        ),
      }),
    })

    expect(report.classification).toBe('migrated_cost')
    expect(report.migratedCost.join('\n')).toContain('reactRenderMs')
    expect(report.migratedRisk.join('\n')).toContain('runSyncFallbackCount')
  })

  it('classifies P0/P1/P2 suite aliases as required adversarial hot paths', () => {
    const report = classifyAdversarialMatrix({
      diff: baseDiff({
        cells: [],
        suites: ADVERSARIAL_REQUIRED_HOT_PATHS.map((hotPath) => ({ id: hotPath, status: 'pass' })),
      }),
    })

    expect(report.classification).toBe('tax_removed')
    expect(report.requiredHotPaths.every((item) => item.present)).toBe(true)
  })

  it('treats missing artifact matrixHash as incomplete hard-claim evidence', () => {
    const { matrixHash: _matrixHash, ...diffWithoutMatrixHash } = baseDiff()
    const report = classifyAdversarialMatrix({ diff: diffWithoutMatrixHash })

    expect(report.classification).toBe('inconclusive')
    expect(report.claimStrength).toBe('none')
    expect(report.matrixHashSource).toBe('computed-fallback')
    expect(report.missingEvidence.join('\n')).toContain('matrixHash is missing')
  })

  it('renders claim boundaries', () => {
    const markdown = renderAdversarialMatrixMarkdown(classifyAdversarialMatrix({ diff: baseDiff() }))

    expect(markdown).toContain('# Adversarial Performance Matrix Report')
    expect(markdown).toContain('UNKNOWN/missing is not PASS')
    expect(markdown).toContain('Global Runtime performance improved')
    expect(markdown).toContain('matrixHashSource: artifact')
  })
})