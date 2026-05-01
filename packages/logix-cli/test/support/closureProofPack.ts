import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'

import { runCli } from '../../src/internal/entry.js'
import type { CommandResult } from '../../src/internal/result.js'
import { makeControlPlaneReportFixture } from './controlPlaneReport.js'

type FailureFamily = 'program-assembly' | 'source-declaration' | 'dependency'

const failureByFamily = (family: FailureFamily) => {
  switch (family) {
    case 'program-assembly':
      return {
        errorCode: 'PROGRAM_IMPORT_DUPLICATE',
        summary: 'duplicate Program import',
        ownerCoordinate: 'Program.capabilities.imports:BillingProgram',
        focusRef: { declSliceId: 'Program.capabilities.imports:BillingProgram' },
        findingKind: 'import' as const,
      }
    case 'source-declaration':
      return {
        errorCode: 'DECLARATION_DIGEST_STALE',
        summary: 'source declaration digest is stale',
        ownerCoordinate: 'Program(SourceFreshness).declaration',
        focusRef: { declSliceId: 'Program(SourceFreshness).declaration', sourceRef: 'src/source-freshness.ts' },
        findingKind: 'declaration' as const,
      }
    case 'dependency':
      return {
        errorCode: 'MissingDependency',
        summary: 'missing child Program dependency',
        ownerCoordinate: 'Program.capabilities.imports:ChildProgram',
        focusRef: { declSliceId: 'Program.capabilities.imports:ChildProgram' },
        findingKind: 'dependency' as const,
      }
  }
}

export const makeFailReportFixture = (input: {
  readonly runId: string
  readonly family: FailureFamily
}) => {
  const failure = failureByFamily(input.family)
  return {
    ...makeControlPlaneReportFixture({
      runId: input.runId,
      verdict: 'FAIL',
      errorCode: failure.errorCode,
      environment: {
        host: 'node',
        declarationDigest: 'decl:stable',
        scenarioPlanDigest: 'scenario:none',
        evidenceSummaryDigest: 'evidence:stable',
      },
    }),
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
    nextRecommendedStage: failure.findingKind === 'dependency' ? 'trial' : 'check',
  }
}

export const makeAfterPassReportFixture = (runId: string) =>
  makeControlPlaneReportFixture({
    runId,
    verdict: 'PASS',
    environment: {
      host: 'node',
      declarationDigest: 'decl:stable',
      scenarioPlanDigest: 'scenario:none',
      evidenceSummaryDigest: 'evidence:stable',
    },
  })

export const writeProofReports = async (dir: string, family: FailureFamily) => {
  const beforeReport = makeFailReportFixture({ runId: `${family}:before`, family })
  const afterReport = makeAfterPassReportFixture(`${family}:after`)
  const beforeReportRef = path.join(dir, `${family}.before.report.json`)
  const afterReportRef = path.join(dir, `${family}.after.report.json`)
  await fs.writeFile(beforeReportRef, `${JSON.stringify(beforeReport, null, 2)}\n`, 'utf8')
  await fs.writeFile(afterReportRef, `${JSON.stringify(afterReport, null, 2)}\n`, 'utf8')
  return { beforeReportRef, afterReportRef }
}

export const runCompareProofPack = async (args: {
  readonly dir: string
  readonly family: FailureFamily
  readonly runId: string
}): Promise<CommandResult> => {
  const reports = await writeProofReports(args.dir, args.family)
  const out = await Effect.runPromise(
    runCli([
      'compare',
      '--runId',
      args.runId,
      '--beforeReport',
      reports.beforeReportRef,
      '--afterReport',
      reports.afterReportRef,
    ]),
  )
  if (out.kind !== 'result') throw new Error('expected result')
  return out.result
}

export const primaryCompareReport = (result: CommandResult) =>
  result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)?.inline
