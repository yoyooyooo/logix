import { describe, expect, it } from 'vitest'
import {
  compareVerificationControlPlaneReports,
  isVerificationControlPlaneReport,
} from '../../src/ControlPlane.js'

const makeReport = (runId: string, env: Record<string, unknown>) => ({
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'trial',
  mode: 'startup',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: { runId, ...env },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: null,
} as const)

const makeFailReport = (
  runId: string,
  env: Record<string, unknown>,
  failure: {
    readonly errorCode: string
    readonly summary: string
    readonly ownerCoordinate: string
    readonly focusRef: { readonly declSliceId?: string; readonly sourceRef?: string }
    readonly findingKind: 'blueprint' | 'import' | 'declaration' | 'dependency'
  } = {
    errorCode: 'MissingDependency',
    summary: 'missing dependency',
    ownerCoordinate: 'service:BusinessService',
    focusRef: { declSliceId: 'service:BusinessService' },
    findingKind: 'dependency',
  },
) => ({
  ...makeReport(runId, env),
  verdict: 'FAIL',
  errorCode: failure.errorCode,
  summary: failure.summary,
  findings: [
    {
      kind: failure.findingKind,
      code: failure.errorCode,
      ownerCoordinate: failure.ownerCoordinate,
      summary: failure.summary,
      focusRef: failure.focusRef,
    },
  ],
  repairHints: [
    {
      code: failure.errorCode,
      canAutoRetry: false,
      upgradeToStage: failure.findingKind === 'dependency' ? 'trial' : 'check',
      focusRef: failure.focusRef,
    },
  ],
} as const)

describe('Verification control-plane compare authority', () => {
  it('is exported from the public ControlPlane subpath', () => {
    expect(typeof compareVerificationControlPlaneReports).toBe('function')
  })

  it('owns compare admissibility digest mismatch semantics', () => {
    const result = compareVerificationControlPlaneReports({
      runId: 'core-compare-1',
      before: makeReport('before', { host: 'node' }),
      after: makeReport('after', { host: 'browser' }),
    })

    expect(isVerificationControlPlaneReport(result)).toBe(true)
    expect(result.stage).toBe('compare')
    expect(result.mode).toBe('compare')
    expect(result.verdict).toBe('INCONCLUSIVE')
    expect(result.errorCode).toBe('COMPARE_ENVIRONMENT_FINGERPRINT_MISMATCH')
    expect(result.admissibility?.result).toBe('inconclusive')
  })

  it('reports declaration digest mismatch as admissibility instead of repair failure', () => {
    const result = compareVerificationControlPlaneReports({
      runId: 'core-compare-declaration',
      before: makeReport('before', { host: 'node', declarationDigest: 'decl:a' }),
      after: makeReport('after', { host: 'node', declarationDigest: 'decl:b' }),
    })

    expect(result.verdict).toBe('INCONCLUSIVE')
    expect(result.errorCode).toBe('COMPARE_DECLARATION_DIGEST_MISMATCH')
    expect(result.nextRecommendedStage).toBe('compare')
    expect(result.findings?.[0]).toMatchObject({
      kind: 'compare',
      ownerCoordinate: 'compare.declarationDigest',
    })
  })

  it('treats FAIL to PASS with matching admissibility as repair closure', () => {
    const env = { host: 'node', declarationDigest: 'decl:fixed', scenarioPlanDigest: 'scenario:none' }
    const result = compareVerificationControlPlaneReports({
      runId: 'core-compare-repair-closure',
      before: makeFailReport('before', env),
      after: makeReport('after', env),
    })

    expect(result.verdict).toBe('PASS')
    expect(result.errorCode).toBeNull()
    expect(result.summary).toBe('Verification repair closed')
    expect(result.admissibility?.result).toBe('admissible')
  })

  it('closes Program assembly, source declaration and dependency repair proof packs', () => {
    const env = {
      host: 'node',
      declarationDigest: 'decl:stable',
      scenarioPlanDigest: 'scenario:none',
      evidenceSummaryDigest: 'evidence:stable',
    }
    const proofPacks = [
      {
        name: 'program-assembly',
        failure: {
          errorCode: 'PROGRAM_IMPORT_DUPLICATE',
          summary: 'duplicate Program import',
          ownerCoordinate: 'Program.capabilities.imports:BillingProgram',
          focusRef: { declSliceId: 'Program.capabilities.imports:BillingProgram' },
          findingKind: 'import' as const,
        },
      },
      {
        name: 'source-declaration',
        failure: {
          errorCode: 'DECLARATION_DIGEST_STALE',
          summary: 'source declaration digest is stale',
          ownerCoordinate: 'Program(SourceFreshness).declaration',
          focusRef: { declSliceId: 'Program(SourceFreshness).declaration', sourceRef: 'src/source-freshness.ts' },
          findingKind: 'declaration' as const,
        },
      },
      {
        name: 'dependency',
        failure: {
          errorCode: 'MissingDependency',
          summary: 'missing child Program dependency',
          ownerCoordinate: 'Program.capabilities.imports:ChildProgram',
          focusRef: { declSliceId: 'Program.capabilities.imports:ChildProgram' },
          findingKind: 'dependency' as const,
        },
      },
    ]

    for (const proofPack of proofPacks) {
      const result = compareVerificationControlPlaneReports({
        runId: `core-compare-${proofPack.name}-closure`,
        before: makeFailReport(`before-${proofPack.name}`, env, proofPack.failure),
        after: makeReport(`after-${proofPack.name}`, env),
      })

      expect(result.verdict).toBe('PASS')
      expect(result.errorCode).toBeNull()
      expect(result.summary).toBe('Verification repair closed')
      expect(result.admissibility?.result).toBe('admissible')
    }
  })
})
